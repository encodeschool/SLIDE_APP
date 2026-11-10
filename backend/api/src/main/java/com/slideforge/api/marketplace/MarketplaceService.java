package com.slideforge.api.marketplace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketplaceService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public MarketplaceService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    private JsonNode decodeDocument(String serialized) {
        try {
            return objectMapper.readTree(serialized);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Stored canonical presentation document could not be decoded", exception);
        }
    }

    @Transactional
    public ListingResponse createDraft(UUID sellerId, CreateListingRequest request) {
        String category = request.category() == null || request.category().isBlank() ? "other" : request.category();
        requireCategory(category);
        PresentationSnapshot snapshot;
        try {
            snapshot = jdbcTemplate.queryForObject(
                    """
                    SELECT pv.document::text
                    FROM presentations p
                    JOIN presentation_versions pv ON pv.presentation_id = p.id
                    WHERE p.id = ? AND p.owner_id = ? AND pv.version = ? AND p.deleted_at IS NULL
                    """,
                    (rs, row) -> {
                        JsonNode document = decodeDocument(rs.getString(1));
                        return new PresentationSnapshot(document.path("title").asText(), document);
                    },
                    request.presentationId(),
                    sellerId,
                    request.presentationVersion());
        } catch (EmptyResultDataAccessException exception) {
            throw listingNotFound();
        }

        UUID listingId = UUID.randomUUID();
        UUID versionId = UUID.randomUUID();
        Instant now = clock.instant();
        jdbcTemplate.update(
                """
                INSERT INTO listings (id, seller_id, title, description, category, status, current_version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'DRAFT', 1, ?, ?)
                """,
                listingId,
                sellerId,
                snapshot.title(),
                request.description().strip(),
                category,
                databaseTimestamp(now),
                databaseTimestamp(now));
        insertVersion(
                listingId,
                versionId,
                1,
                snapshot.title(),
                request.description().strip(),
                request.priceTiyin(),
                request.licenseTerms(),
                snapshot.document(),
                databaseTimestamp(now));
        return findOwnerListing(sellerId, listingId);
    }

    @Transactional
    public ListingResponse updateDraft(UUID sellerId, UUID listingId, UpdateDraftListingRequest request) {
        Listing listing = lockOwnerListing(sellerId, listingId);
        if (!"DRAFT".equals(listing.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "LISTING_NOT_DRAFT", "Only draft listings can be edited");
        }
        if (listing.currentVersion() != request.expectedVersion()) {
            throw new ApiException(HttpStatus.CONFLICT, "LISTING_VERSION_CONFLICT", "Listing changed; reload before editing");
        }
        ListingVersion current = currentVersion(listingId, listing.currentVersion());
        int nextVersion = listing.currentVersion() + 1;
        Instant now = clock.instant();
        String category = request.category() == null
                ? jdbcTemplate.queryForObject("SELECT category FROM listings WHERE id = ?", String.class, listingId)
                : request.category().isBlank() ? "other" : request.category();
        requireCategory(category);
        jdbcTemplate.update(
                "UPDATE listings SET description = ?, category = ?, current_version = ?, updated_at = ? WHERE id = ?",
                request.description().strip(),
                category,
                nextVersion,
                databaseTimestamp(now),
                listingId);
        insertVersion(
                listingId,
                UUID.randomUUID(),
                nextVersion,
                listing.title(),
                request.description().strip(),
                request.priceTiyin(),
                request.licenseTerms(),
                current.document(),
                databaseTimestamp(now));
        return findOwnerListing(sellerId, listingId);
    }

    @Transactional
    public ListingResponse publish(UUID sellerId, UUID listingId) {
        Listing listing = lockOwnerListing(sellerId, listingId);
        if (!"DRAFT".equals(listing.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "LISTING_NOT_DRAFT", "Only draft listings can be published");
        }
        jdbcTemplate.update(
                "UPDATE listings SET status = 'PUBLISHED', updated_at = ? WHERE id = ?",
                databaseTimestamp(clock.instant()),
                listingId);
        return findOwnerListing(sellerId, listingId);
    }

    @Transactional
    public ListingResponse archive(UUID sellerId, UUID listingId) {
        Listing listing = lockOwnerListing(sellerId, listingId);
        if ("ARCHIVED".equals(listing.status())) {
            return findOwnerListing(sellerId, listingId);
        }
        jdbcTemplate.update(
                "UPDATE listings SET status = 'ARCHIVED', updated_at = ? WHERE id = ?",
                databaseTimestamp(clock.instant()),
                listingId);
        return findOwnerListing(sellerId, listingId);
    }

    @Transactional(readOnly = true)
    public CatalogPageResponse catalog(int page, int size, String category) {
        validatePage(page, size);
        if (category != null && !category.isBlank()) requireCategory(category);
        long offset = (long) page * size;
        List<CatalogItemResponse> items = jdbcTemplate.query(
                """
                SELECT l.id AS listing_id, lv.id AS version_id, lv.title, lv.description,
                       l.seller_id, u.display_name AS seller_name, lv.version, lv.price_tiyin,
                       lv.currency, l.updated_at, l.category
                FROM listings l
                JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                JOIN users u ON u.id = l.seller_id
                WHERE l.status = 'PUBLISHED' AND lv.document IS NOT NULL AND lv.title IS NOT NULL
                  AND (CAST(? AS VARCHAR) IS NULL OR l.category = CAST(? AS VARCHAR))
                ORDER BY l.updated_at DESC, l.id
                LIMIT ? OFFSET ?
                """,
                catalogRowMapper(),
                category,
                category,
                size,
                offset);
        Long total = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM listings l
                JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                WHERE l.status = 'PUBLISHED' AND lv.document IS NOT NULL AND lv.title IS NOT NULL
                  AND (CAST(? AS VARCHAR) IS NULL OR l.category = CAST(? AS VARCHAR))
                """,
                Long.class,
                category,
                category);
        return new CatalogPageResponse(items, page, size, total == null ? 0 : total);
    }

    @Transactional(readOnly = true)
    public ListingDetailResponse catalogListing(UUID listingId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    SELECT l.id AS listing_id, lv.id AS version_id, lv.title, lv.description,
                           lv.license_terms, l.seller_id, u.display_name AS seller_name, lv.version,
                           lv.price_tiyin, lv.currency, l.category, l.updated_at
                    FROM listings l
                    JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                    JOIN users u ON u.id = l.seller_id
                    WHERE l.id = ? AND l.status = 'PUBLISHED'
                      AND lv.document IS NOT NULL AND lv.title IS NOT NULL
                    """,
                    (rs, row) -> new ListingDetailResponse(
                            rs.getObject("listing_id", UUID.class),
                            rs.getObject("version_id", UUID.class),
                            rs.getString("title"),
                            rs.getString("description"),
                            rs.getString("license_terms"),
                            rs.getObject("seller_id", UUID.class),
                            rs.getString("seller_name"),
                            rs.getInt("version"),
                            rs.getLong("price_tiyin"),
                            rs.getString("currency"),
                            rs.getString("category"),
                            rs.getTimestamp("updated_at").toInstant()),
                    listingId);
        } catch (EmptyResultDataAccessException exception) {
            throw listingNotFound();
        }
    }

    @Transactional(readOnly = true)
    public List<MarketplaceCategoryResponse> categories() {
        return jdbcTemplate.query(
                """
                SELECT slug, display_name, display_name_ru, display_name_uz
                FROM marketplace_categories WHERE active = TRUE ORDER BY display_name
                """,
                (rs, row) -> new MarketplaceCategoryResponse(
                        rs.getString("slug"),
                        rs.getString("display_name"),
                        rs.getString("display_name_ru"),
                        rs.getString("display_name_uz")));
    }

    @Transactional(readOnly = true)
    public List<AdminMarketplaceCategoryResponse> adminCategories() {
        return jdbcTemplate.query(
                """
                SELECT slug, display_name, display_name_ru, display_name_uz, active
                FROM marketplace_categories ORDER BY display_name
                """,
                (rs, row) -> new AdminMarketplaceCategoryResponse(
                        rs.getString("slug"),
                        rs.getString("display_name"),
                        rs.getString("display_name_ru"),
                        rs.getString("display_name_uz"),
                        rs.getBoolean("active")));
    }

    @Transactional
    public AdminMarketplaceCategoryResponse createCategory(CreateMarketplaceCategoryRequest request) {
        int inserted = jdbcTemplate.update(
                """
                INSERT INTO marketplace_categories
                    (slug, display_name, display_name_ru, display_name_uz, active)
                VALUES (?, ?, ?, ?, TRUE)
                ON CONFLICT (slug) DO NOTHING
                """,
                request.slug(),
                request.nameEn().strip(),
                request.nameRu().strip(),
                request.nameUz().strip());
        if (inserted == 0) {
            throw new ApiException(
                    HttpStatus.CONFLICT, "CATEGORY_ALREADY_EXISTS", "Marketplace category slug is already in use");
        }
        return adminCategories().stream()
                .filter(category -> category.slug().equals(request.slug()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Created marketplace category was not returned"));
    }

    @Transactional
    public AdminMarketplaceCategoryResponse updateCategoryStatus(String slug, boolean active) {
        List<Boolean> existing = jdbcTemplate.query(
                "SELECT active FROM marketplace_categories WHERE slug = ? FOR UPDATE",
                (rs, row) -> rs.getBoolean(1),
                slug);
        if (existing.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND", "Marketplace category was not found");
        }
        if (!active && !existing.getFirst()) {
            return adminCategories().stream()
                    .filter(category -> category.slug().equals(slug))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Marketplace category was not returned"));
        }
        if (!active) {
            Integer publishedCount = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM listings WHERE category = ? AND status = 'PUBLISHED'",
                    Integer.class,
                    slug);
            if (publishedCount != null && publishedCount > 0) {
                throw new ApiException(
                        HttpStatus.CONFLICT,
                        "CATEGORY_HAS_PUBLISHED_LISTINGS",
                        "Move published listings before deactivating this category");
            }
        }
        jdbcTemplate.update("UPDATE marketplace_categories SET active = ? WHERE slug = ?", active, slug);
        return adminCategories().stream()
                .filter(category -> category.slug().equals(slug))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Updated marketplace category was not returned"));
    }

    @Transactional(readOnly = true)
    public List<ListingResponse> sellerListings(UUID sellerId) {
        return jdbcTemplate.query(
                """
                SELECT l.id, lv.title, lv.description, l.status, l.current_version,
                       lv.price_tiyin, lv.currency, l.created_at, l.updated_at
                FROM listings l
                JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                WHERE l.seller_id = ?
                ORDER BY l.updated_at DESC, l.id
                """,
                (rs, row) -> new ListingResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getInt("current_version"),
                        rs.getLong("price_tiyin"),
                        rs.getString("currency"),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()),
                sellerId);
    }

    @Transactional(readOnly = true)
    public AdminListingPageResponse adminListings(int page, int size) {
        validatePage(page, size);
        long offset = (long) page * size;
        List<AdminListingResponse> items = jdbcTemplate.query(
                """
                SELECT l.id, lv.title, lv.description, l.status, u.display_name AS seller_name,
                       u.email AS seller_email, l.category, l.current_version, lv.price_tiyin,
                       lv.currency, l.updated_at
                FROM listings l
                JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                JOIN users u ON u.id = l.seller_id
                ORDER BY l.updated_at DESC, l.id
                LIMIT ? OFFSET ?
                """,
                (rs, row) -> new AdminListingResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getString("seller_name"),
                        rs.getString("seller_email"),
                        rs.getString("category"),
                        rs.getInt("current_version"),
                        rs.getLong("price_tiyin"),
                        rs.getString("currency"),
                        rs.getTimestamp("updated_at").toInstant()),
                size,
                offset);
        Long total = jdbcTemplate.queryForObject("SELECT count(*) FROM listings", Long.class);
        return new AdminListingPageResponse(items, page, size, total == null ? 0 : total);
    }

    @Transactional
    public AdminListingResponse adminUpdateListingStatus(UUID listingId, String status) {
        List<String> current = jdbcTemplate.query(
                "SELECT status FROM listings WHERE id = ? FOR UPDATE",
                (rs, row) -> rs.getString(1),
                listingId);
        if (current.isEmpty()) throw listingNotFound();
        if ("ARCHIVED".equals(current.getFirst())) {
            throw new ApiException(HttpStatus.CONFLICT, "LISTING_ARCHIVED", "Archived listings cannot be moderated");
        }
        jdbcTemplate.update(
                "UPDATE listings SET status = ?, updated_at = ? WHERE id = ?",
                status,
                databaseTimestamp(clock.instant()),
                listingId);
        return jdbcTemplate.queryForObject(
                """
                SELECT l.id, lv.title, lv.description, l.status, u.display_name AS seller_name,
                       u.email AS seller_email, l.category, l.current_version, lv.price_tiyin,
                       lv.currency, l.updated_at
                FROM listings l
                JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                JOIN users u ON u.id = l.seller_id
                WHERE l.id = ?
                """,
                (rs, row) -> new AdminListingResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getString("seller_name"),
                        rs.getString("seller_email"),
                        rs.getString("category"),
                        rs.getInt("current_version"),
                        rs.getLong("price_tiyin"),
                        rs.getString("currency"),
                        rs.getTimestamp("updated_at").toInstant()),
                listingId);
    }

    @Transactional
    public MarketplacePreferenceResponse preference(UUID userId) {
        List<String> categories = jdbcTemplate.query(
                "SELECT preferred_category FROM marketplace_preferences WHERE user_id = ?",
                (rs, row) -> rs.getString(1),
                userId);
        return new MarketplacePreferenceResponse(categories.isEmpty() ? null : categories.getFirst());
    }

    @Transactional
    public MarketplacePreferenceResponse updatePreference(UUID userId, MarketplacePreferenceRequest request) {
        String category = request.preferredCategory();
        if (category != null && !category.isBlank() && !categoryExists(category)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CATEGORY", "Marketplace category is not supported");
        }
        jdbcTemplate.update(
                """
                INSERT INTO marketplace_preferences (user_id, preferred_category, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT (user_id) DO UPDATE
                SET preferred_category = EXCLUDED.preferred_category, updated_at = EXCLUDED.updated_at
                """,
                userId,
                category == null || category.isBlank() ? null : category,
                databaseTimestamp(clock.instant()));
        return preference(userId);
    }

    private boolean categoryExists(String category) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM marketplace_categories WHERE slug = ? AND active = TRUE",
                Integer.class,
                category);
        return count != null && count > 0;
    }

    private void requireCategory(String category) {
        if (!categoryExists(category)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CATEGORY", "Marketplace category is not supported");
        }
    }

    @Transactional
    public OrderResponse createOrder(UUID buyerId, CreateOrderRequest request) {
        ExistingOrder existing = findIdempotentOrder(buyerId, request.idempotencyKey());
        if (existing != null) {
            if (!existing.listingId().equals(request.listingId())) {
                throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for another listing");
            }
            return orderResponse(existing.orderId());
        }

        PurchasableVersion version;
        try {
            version = jdbcTemplate.queryForObject(
                    """
                    SELECT lv.id, lv.price_tiyin, lv.currency
                    FROM listings l
                    JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                    WHERE l.id = ? AND l.status = 'PUBLISHED' AND lv.document IS NOT NULL AND lv.title IS NOT NULL
                    FOR SHARE OF l
                    """,
                    (rs, row) -> new PurchasableVersion(
                            rs.getObject("id", UUID.class), rs.getLong("price_tiyin"), rs.getString("currency")),
                    request.listingId());
        } catch (EmptyResultDataAccessException exception) {
            throw listingNotFound();
        }

        UUID orderId = UUID.randomUUID();
        Instant now = clock.instant();
        List<UUID> inserted = jdbcTemplate.query(
                """
                INSERT INTO orders (id, buyer_id, status, total_tiyin, currency, provider, idempotency_key, created_at)
                VALUES (?, ?, 'PENDING', ?, ?, 'SANDBOX', ?, ?)
                ON CONFLICT (buyer_id, idempotency_key) DO NOTHING
                RETURNING id
                """,
                (rs, row) -> rs.getObject(1, UUID.class),
                orderId,
                buyerId,
                version.priceTiyin(),
                version.currency(),
                request.idempotencyKey(),
                databaseTimestamp(now));
        if (inserted.isEmpty()) {
            ExistingOrder concurrent = findIdempotentOrder(buyerId, request.idempotencyKey());
            if (concurrent == null || !concurrent.listingId().equals(request.listingId())) {
                throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for another listing");
            }
            return orderResponse(concurrent.orderId());
        }

        jdbcTemplate.update(
                "INSERT INTO order_items (id, order_id, listing_version_id, price_tiyin) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(),
                orderId,
                version.id(),
                version.priceTiyin());
        return orderResponse(orderId);
    }

    OrderResponse orderResponse(UUID orderId) {
        return jdbcTemplate.queryForObject(
                """
                SELECT o.id, o.status, o.total_tiyin, o.currency, oi.listing_version_id, o.created_at
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                WHERE o.id = ?
                """,
                (rs, row) -> new OrderResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("status"),
                        rs.getLong("total_tiyin"),
                        rs.getString("currency"),
                        rs.getObject("listing_version_id", UUID.class),
                        rs.getTimestamp("created_at").toInstant()),
                orderId);
    }

    private ExistingOrder findIdempotentOrder(UUID buyerId, String key) {
        List<ExistingOrder> rows = jdbcTemplate.query(
                """
                SELECT o.id AS order_id, l.id AS listing_id
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN listing_versions lv ON lv.id = oi.listing_version_id
                JOIN listings l ON l.id = lv.listing_id
                WHERE o.buyer_id = ? AND o.idempotency_key = ?
                """,
                (rs, row) -> new ExistingOrder(
                        rs.getObject("order_id", UUID.class), rs.getObject("listing_id", UUID.class)),
                buyerId,
                key);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private void insertVersion(
            UUID listingId,
            UUID versionId,
            int version,
            String title,
            String description,
            long price,
            String licenseTerms,
            JsonNode document,
            OffsetDateTime now) {
        String serialized;
        try {
            serialized = objectMapper.writeValueAsString(document);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Canonical presentation document could not be encoded", exception);
        }
        jdbcTemplate.update(
                """
                INSERT INTO listing_versions
                    (id, listing_id, version, price_tiyin, currency, file_object_key, file_sha256, license_terms, document, title, description, created_at)
                VALUES (?, ?, ?, ?, 'UZS', ?, ?, ?, ?::jsonb, ?, ?, ?)
                """,
                versionId,
                listingId,
                version,
                price,
                "canonical-json:" + versionId,
                sha256(serialized),
                licenseTerms.strip(),
                serialized,
                title,
                description,
                now);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static OffsetDateTime databaseTimestamp(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }

    private Listing lockOwnerListing(UUID sellerId, UUID listingId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT id, title, description, status, current_version, created_at, updated_at FROM listings WHERE id = ? AND seller_id = ? FOR UPDATE",
                    listingRowMapper(),
                    listingId,
                    sellerId);
        } catch (EmptyResultDataAccessException exception) {
            throw listingNotFound();
        }
    }

    private ListingResponse findOwnerListing(UUID sellerId, UUID listingId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    SELECT l.id, lv.title, lv.description, l.status, l.current_version,
                           lv.price_tiyin, lv.currency, l.created_at, l.updated_at
                    FROM listings l
                    JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
                    WHERE l.id = ? AND l.seller_id = ?
                    """,
                    (rs, row) -> new ListingResponse(
                            rs.getObject("id", UUID.class),
                            rs.getString("title"),
                            rs.getString("description"),
                            rs.getString("status"),
                            rs.getInt("current_version"),
                            rs.getLong("price_tiyin"),
                            rs.getString("currency"),
                            rs.getTimestamp("created_at").toInstant(),
                            rs.getTimestamp("updated_at").toInstant()),
                    listingId,
                    sellerId);
        } catch (EmptyResultDataAccessException exception) {
            throw listingNotFound();
        }
    }

    private ListingVersion currentVersion(UUID listingId, int version) {
        return jdbcTemplate.queryForObject(
                "SELECT document::text FROM listing_versions WHERE listing_id = ? AND version = ?",
                (rs, row) -> new ListingVersion(decodeDocument(rs.getString(1))),
                listingId,
                version);
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 50 || (long) page * size > Integer.MAX_VALUE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAGE", "Page must be non-negative and size must be between 1 and 50");
        }
    }

    private RowMapper<Listing> listingRowMapper() {
        return (rs, row) -> new Listing(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getInt("current_version"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }

    private RowMapper<CatalogItemResponse> catalogRowMapper() {
        return (rs, row) -> new CatalogItemResponse(
                rs.getObject("listing_id", UUID.class),
                rs.getObject("version_id", UUID.class),
                rs.getString("title"),
                rs.getString("description"),
                rs.getObject("seller_id", UUID.class),
                rs.getInt("version"),
                rs.getLong("price_tiyin"),
                rs.getString("currency"),
                rs.getTimestamp("updated_at").toInstant(),
                rs.getString("category"),
                rs.getString("seller_name"));
    }

    private ApiException listingNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "LISTING_NOT_FOUND", "Listing was not found");
    }

    private record PresentationSnapshot(String title, JsonNode document) {
    }

    private record Listing(
            UUID id, String title, String description, String status, int currentVersion, Instant createdAt, Instant updatedAt) {
    }

    private record ListingVersion(JsonNode document) {
    }

    private record PurchasableVersion(UUID id, long priceTiyin, String currency) {
    }

    private record ExistingOrder(UUID orderId, UUID listingId) {
    }
}
