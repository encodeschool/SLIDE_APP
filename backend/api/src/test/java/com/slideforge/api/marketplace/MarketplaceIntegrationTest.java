package com.slideforge.api.marketplace;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.slideforge.api.auth.AuthTestSupport;
import com.slideforge.api.auth.MailDelivery;
import com.slideforge.api.auth.LoginRequest;
import com.slideforge.api.auth.RegisterRequest;
import com.slideforge.api.exports.RendererClient;
import jakarta.persistence.EntityManager;
import java.nio.file.Path;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.auth.rate-limit-max-requests=10000")
@AutoConfigureMockMvc
@Transactional
class MarketplaceIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @MockBean
    private MailDelivery mailDelivery;

    @MockBean
    private RendererClient rendererClient;

    @Test
    void categoryManagementIsSuperadminOnlyAndPublishesLocalizedNames() throws Exception {
        Account administrator = register("category-admin");
        Account superadministrator = register("category-superadmin");
        jdbcTemplate.update(
                "INSERT INTO user_roles (user_id, role) VALUES (?, 'ADMIN')",
                administrator.id());
        jdbcTemplate.update(
                "INSERT INTO user_roles (user_id, role) VALUES (?, 'ADMIN'), (?, 'SUPERADMIN')",
                superadministrator.id(),
                superadministrator.id());
        entityManager.clear();
        String adminToken = login(administrator);
        String superadminToken = login(superadministrator);

        mockMvc.perform(get("/api/v1/admin/marketplace/categories")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/marketplace/categories")
                        .header("Authorization", bearer(superadminToken)))
                .andExpect(status().isOk());

        String category = """
                {"slug":"science","nameEn":"Science","nameRu":"Наука","nameUz":"Ilm-fan"}
                """;
        mockMvc.perform(post("/api/v1/admin/marketplace/categories")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(category))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/marketplace/categories")
                        .header("Authorization", bearer(superadminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(category))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nameUz").value("Ilm-fan"));
        mockMvc.perform(post("/api/v1/admin/marketplace/categories")
                        .header("Authorization", bearer(superadminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(category))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/v1/catalog/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == 'science')].nameUz").value("Ilm-fan"));
        mockMvc.perform(patch("/api/v1/admin/marketplace/categories/science/status")
                        .header("Authorization", bearer(superadminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
        mockMvc.perform(get("/api/v1/catalog/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == 'science')]").isEmpty());
    }

    @Test
    void ownersControlDraftsAndOnlyPublishedListingsAppearInThePublicCatalog() throws Exception {
        Account seller = register("seller");
        Account stranger = register("stranger");
        UUID deckId = createPresentation(seller.token(), "Seller deck", 5);
        long listingPrice = 1_000_000_000_000L
                + Math.floorMod(UUID.randomUUID().getMostSignificantBits(), 1_000_000_000L);
        UUID listingId = createListing(seller, deckId, 1, listingPrice);
        mockMvc.perform(get("/api/v1/seller/listings")
                        .header("Authorization", bearer(seller.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(listingId.toString()));
        mockMvc.perform(get("/api/v1/seller/listings")
                        .header("Authorization", bearer(stranger.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(get("/api/v1/catalog?minPriceTiyin={price}&maxPriceTiyin={price}", listingPrice, listingPrice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
        mockMvc.perform(put("/api/v1/seller/listings/{id}", listingId)
                        .header("Authorization", bearer(stranger.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateDraftListingRequest(1, 1900L, "forbidden", "personal use"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LISTING_NOT_FOUND"));
        mockMvc.perform(post("/api/v1/seller/listings/{id}/publish", listingId)
                        .header("Authorization", bearer(stranger.token())))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/seller/listings/{id}", listingId)
                        .header("Authorization", bearer(stranger.token())))
                .andExpect(status().isNotFound());

        UUID foreignDeck = createPresentation(stranger.token(), "Stranger deck");
        mockMvc.perform(post("/api/v1/seller/listings")
                        .header("Authorization", bearer(seller.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateListingRequest(foreignDeck, 1, 1000L, "desc", "terms"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/v1/seller/listings/{id}", listingId)
                        .header("Authorization", bearer(seller.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateDraftListingRequest(1, listingPrice + 100, "updated description", "commercial license"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion").value(2))
                .andExpect(jsonPath("$.priceTiyin").value(listingPrice + 100));

        assertVersionSnapshot(listingId, 1, listingPrice);
        assertVersionSnapshot(listingId, 2, listingPrice + 100);

        mockMvc.perform(post("/api/v1/seller/listings/{id}/publish", listingId)
                        .header("Authorization", bearer(seller.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mockMvc.perform(get(
                        "/api/v1/catalog?page=0&size=1&minPriceTiyin={price}&maxPriceTiyin={price}",
                        listingPrice + 100,
                        listingPrice + 100))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].listingId").value(listingId.toString()))
                .andExpect(jsonPath("$.items[0].version").value(2))
                .andExpect(jsonPath("$.items[0].priceTiyin").value(listingPrice + 100))
                .andExpect(jsonPath("$.items[0].category").value("education"))
                .andExpect(jsonPath("$.items[0].sellerName").value("seller"))
                .andExpect(jsonPath("$.items[0].slideCount").value(5))
                .andExpect(jsonPath("$.items[0].previewSlides.length()").value(3))
                .andExpect(jsonPath("$.items[0].document").doesNotExist());
        mockMvc.perform(get(
                        "/api/v1/catalog?category=business&minPriceTiyin={price}&maxPriceTiyin={price}",
                        listingPrice + 100,
                        listingPrice + 100))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
        mockMvc.perform(get("/api/v1/catalog/{id}", listingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sellerName").value("seller"))
                .andExpect(jsonPath("$.licenseTerms").value("commercial license"))
                .andExpect(jsonPath("$.slideCount").value(5))
                .andExpect(jsonPath("$.previewSlides.length()").value(3))
                .andExpect(jsonPath("$.category").value("education"));
        mockMvc.perform(get("/api/v1/catalog?page=-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PAGE"));
        mockMvc.perform(get("/api/v1/catalog?category=unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CATEGORY"));
    }

    @Test
    void marketplacePreferencesRequireAnAccountAndAreOwnerScoped() throws Exception {
        Account account = register("market-preference");
        mockMvc.perform(get("/api/v1/catalog/preferences"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/v1/catalog/preferences")
                        .header("Authorization", bearer(account.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MarketplacePreferenceRequest("technology"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preferredCategory").value("technology"));
        mockMvc.perform(get("/api/v1/catalog/preferences")
                        .header("Authorization", bearer(account.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preferredCategory").value("technology"));
        mockMvc.perform(put("/api/v1/catalog/preferences")
                        .header("Authorization", bearer(account.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MarketplacePreferenceRequest("invalid"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CATEGORY"));
    }

    @Test
    void marketplaceModerationRequiresAnAdministrator() throws Exception {
        Account seller = register("moderation");
        UUID deckId = createPresentation(seller.token(), "Moderated deck");
        UUID listingId = createListing(seller, deckId, 1, 2000);
        mockMvc.perform(get("/api/v1/admin/marketplace/listings")
                        .header("Authorization", bearer(seller.token())))
                .andExpect(status().isForbidden());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                                "/api/v1/admin/marketplace/listings/{id}/status", listingId)
                        .header("Authorization", bearer(seller.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AdminListingStatusRequest("SUSPENDED"))))
                .andExpect(status().isForbidden());

        jdbcTemplate.update("INSERT INTO user_roles (user_id, role) VALUES (?, 'ADMIN')", seller.id());
        entityManager.clear();
        String adminToken = login(seller);
        mockMvc.perform(get("/api/v1/admin/marketplace/listings")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sellerEmail").exists());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                                "/api/v1/admin/marketplace/listings/{id}/status", listingId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AdminListingStatusRequest("SUSPENDED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));
        mockMvc.perform(get("/api/v1/catalog/{id}", listingId))
                .andExpect(status().isNotFound());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                                "/api/v1/admin/marketplace/listings/{id}/status", listingId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AdminListingStatusRequest("PUBLISHED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    @Test
    void checkoutUsesPublishedDatabasePriceAndIdempotencyKey() throws Exception {
        Account seller = register("seller");
        Account buyer = register("buyer");
        UUID deckId = createPresentation(seller.token(), "Buyable deck");
        UUID listingId = createListing(seller, deckId, 1, 4250);
        mockMvc.perform(post("/api/v1/seller/listings/{id}/publish", listingId)
                        .header("Authorization", bearer(seller.token())))
                .andExpect(status().isOk());

        CreateOrderRequest request = new CreateOrderRequest(listingId, "checkout-" + UUID.randomUUID());
        MvcResult first = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", bearer(buyer.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalTiyin").value(4250))
                .andReturn();
        JsonNode firstOrder = objectMapper.readTree(first.getResponse().getContentAsString());
        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", bearer(buyer.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(firstOrder.path("id").asText()));
        mockMvc.perform(post("/api/v1/orders/{id}/sandbox-confirm", firstOrder.path("id").asText())
                        .header("Authorization", bearer(buyer.token())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SANDBOX_DISABLED"));

        mockMvc.perform(delete("/api/v1/seller/listings/{id}", listingId)
                        .header("Authorization", bearer(seller.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"));
        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", bearer(buyer.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateOrderRequest(listingId, "new-" + UUID.randomUUID()))))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/catalog/{id}", listingId))
                .andExpect(status().isNotFound());
    }

    @Test
    void rejectsInvalidListingPricesAndPagination() throws Exception {
        Account seller = register("validation");
        UUID deckId = createPresentation(seller.token(), "Validation deck");
        mockMvc.perform(post("/api/v1/seller/listings")
                        .header("Authorization", bearer(seller.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateListingRequest(deckId, 1, 0L, "description", "terms"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/catalog?size=51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PAGE"));
    }

    @Test
    void fileListingsArePrivateUntilPurchaseAndDownloadRequiresTheBuyersEntitlement() throws Exception {
        Account seller = register("file-seller");
        Account buyer = register("file-buyer");
        Account stranger = register("file-stranger");
        byte[] fileBytes = "%PDF-1.7\nprivate course notes".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile("file", "client-report.pdf", "application/pdf", fileBytes);

        MvcResult created = mockMvc.perform(multipart("/api/v1/seller/listings/uploads")
                        .file(file)
                        .header("Authorization", bearer(seller.token()))
                        .param("title", "Course notes")
                        .param("workType", "document")
                        .param("priceTiyin", "4250")
                        .param("description", "A downloadable document")
                        .param("licenseTerms", "Personal use")
                        .param("category", "education"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.workType").value("document"))
                .andExpect(jsonPath("$.fileName").value("client-report.pdf"))
                .andExpect(jsonPath("$.fileSize").value(fileBytes.length))
                .andReturn();
        UUID listingId = UUID.fromString(
                objectMapper.readTree(created.getResponse().getContentAsString()).path("id").asText());

        mockMvc.perform(get("/api/v1/catalog/{id}/preview", listingId))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/seller/listings/{id}/publish", listingId)
                        .header("Authorization", bearer(seller.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        String pngData = Base64.getEncoder().encodeToString(
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
        ObjectNode rendererPreview = objectMapper.createObjectNode();
        rendererPreview.put("totalPages", 4);
        ArrayNode rendererPages = rendererPreview.putArray("pages");
        rendererPages.addObject().put("pageNumber", 1).put("contentType", "image/png").put("data", pngData);
        when(rendererClient.renderMarketplacePreview(any(Path.class), eq("pdf")))
                .thenReturn(objectMapper.writeValueAsBytes(rendererPreview));
        mockMvc.perform(get("/api/v1/catalog/{id}/preview", listingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPages").value(4))
                .andExpect(jsonPath("$.pages.length()").value(1))
                .andExpect(jsonPath("$.pages[0].pageNumber").value(1))
                .andExpect(jsonPath("$.pages[0].imageDataUrl").value("data:image/png;base64," + pngData));
        mockMvc.perform(get("/api/v1/catalog/{id}/preview", listingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPages").value(4));
        verify(rendererClient, times(1)).renderMarketplacePreview(any(Path.class), eq("pdf"));
        mockMvc.perform(get("/api/v1/catalog/{id}", listingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workType").value("document"))
                .andExpect(jsonPath("$.fileFormat").value("PDF"))
                .andExpect(jsonPath("$.hasDownloadableFile").value(true))
                .andExpect(jsonPath("$.fileName").doesNotExist())
                .andExpect(jsonPath("$.slideCount").value(0));
        mockMvc.perform(get("/api/v1/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.listingId == '" + listingId + "')].hasDownloadableFile").value(true));

        MvcResult order = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", bearer(buyer.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateOrderRequest(listingId, "file-" + UUID.randomUUID()))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalTiyin").value(4250))
                .andReturn();
        UUID orderId = UUID.fromString(objectMapper.readTree(order.getResponse().getContentAsString()).path("id").asText());
        UUID versionId = jdbcTemplate.queryForObject(
                "SELECT listing_version_id FROM order_items WHERE order_id = ?", UUID.class, orderId);
        jdbcTemplate.update("UPDATE orders SET status = 'PAID', paid_at = now() WHERE id = ?", orderId);
        UUID entitlementId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO entitlements (id, user_id, listing_version_id, order_id) VALUES (?, ?, ?, ?)",
                entitlementId,
                buyer.id(),
                versionId,
                orderId);

        mockMvc.perform(get("/api/v1/purchases")
                        .header("Authorization", bearer(buyer.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].hasDownloadableFile").value(true))
                .andExpect(jsonPath("$[0].fileName").value("client-report.pdf"));
        mockMvc.perform(get("/api/v1/purchases/{id}/file", entitlementId)
                        .header("Authorization", bearer(stranger.token())))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/purchases/{id}/file", entitlementId)
                        .header("Authorization", bearer(seller.token())))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/purchases/{id}/file", entitlementId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/purchases/{id}/file", entitlementId)
                        .header("Authorization", bearer(buyer.token())))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(content().bytes(fileBytes))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Content-Disposition", containsString("attachment")))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", "private, no-store"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void fileListingUploadRejectsUnsupportedTypeAndSpoofedPdfContent() throws Exception {
        Account seller = register("file-validation");
        int existingFileListings = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM listing_versions WHERE file_name IS NOT NULL", Integer.class);
        MockMultipartFile unsupported = new MockMultipartFile(
                "file", "program.exe", "application/octet-stream", new byte[] {1, 2, 3});
        mockMvc.perform(multipart("/api/v1/seller/listings/uploads")
                        .file(unsupported)
                        .header("Authorization", bearer(seller.token()))
                        .param("title", "Unsupported")
                        .param("workType", "other")
                        .param("priceTiyin", "100")
                        .param("description", "Description")
                        .param("licenseTerms", "Terms")
                        .param("category", "education"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE_TYPE"));

        MockMultipartFile spoofed = new MockMultipartFile(
                "file", "report.pdf", "application/pdf", "not a pdf".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        mockMvc.perform(multipart("/api/v1/seller/listings/uploads")
                        .file(spoofed)
                        .header("Authorization", bearer(seller.token()))
                        .param("title", "Spoofed")
                        .param("workType", "document")
                        .param("priceTiyin", "100")
                        .param("description", "Description")
                        .param("licenseTerms", "Terms")
                        .param("category", "education"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_CONTENT_MISMATCH"));
        org.junit.jupiter.api.Assertions.assertEquals(
                existingFileListings,
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM listing_versions WHERE file_name IS NOT NULL", Integer.class));
    }

    private Account register(String prefix) throws Exception {
        String email = prefix + "-" + UUID.randomUUID() + "@example.test";
        String token = AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                objectMapper,
                mailDelivery,
                new RegisterRequest(email, "long-enough-test-password", prefix, "en"));
        UUID userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", UUID.class, email);
        return new Account(token, userId);
    }

    private UUID createPresentation(String token, String title) throws Exception {
        return createPresentation(token, title, 1);
    }

    private UUID createPresentation(String token, String title, int slideCount) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/presentations")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new com.slideforge.api.presentations.CreatePresentationRequest(
                                title, "en", document(title, slideCount)))))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private UUID createListing(Account seller, UUID presentationId, int version, long price) throws Exception {
        Integer ownedPresentationVersionCount = jdbcTemplate.queryForObject(
                """
                SELECT count(*) FROM presentations p
                JOIN presentation_versions pv ON pv.presentation_id = p.id
                WHERE p.id = ? AND p.owner_id = ? AND pv.version = 1 AND p.deleted_at IS NULL
                """,
                Integer.class,
                presentationId,
                seller.id());
        org.junit.jupiter.api.Assertions.assertEquals(1, ownedPresentationVersionCount);
        MvcResult result = mockMvc.perform(post("/api/v1/seller/listings")
                        .header("Authorization", bearer(seller.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateListingRequest(presentationId, version, price, "A slide deck", "Personal use", "education"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private void assertVersionSnapshot(UUID listingId, int version, long expectedPrice) {
        Long price = jdbcTemplate.queryForObject(
                "SELECT price_tiyin FROM listing_versions WHERE listing_id = ? AND version = ?",
                Long.class,
                listingId,
                version);
        org.junit.jupiter.api.Assertions.assertEquals(expectedPrice, price);
    }

    private ObjectNode document(String title) {
        return document(title, 1);
    }

    private ObjectNode document(String title, int slideCount) {
        ObjectNode document = objectMapper.createObjectNode();
        document.put("schemaVersion", 1);
        document.put("id", UUID.randomUUID().toString());
        document.put("title", title);
        document.put("language", "en");
        ObjectNode size = document.putObject("size");
        size.put("width", 1280);
        size.put("height", 720);
        ArrayNode slides = document.putArray("slides");
        for (int index = 0; index < slideCount; index++) {
            ObjectNode slide = slides.addObject();
            slide.put("id", UUID.randomUUID().toString());
            ArrayNode elements = slide.putArray("elements");
            ObjectNode text = elements.addObject();
            text.put("id", UUID.randomUUID().toString());
            text.put("type", "text");
            text.put("x", 40);
            text.put("y", 40);
            text.put("w", 400);
            text.put("h", 100);
            text.put("text", "Marketplace source " + (index + 1));
        }
        return document;
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String login(Account account) throws Exception {
        String email = jdbcTemplate.queryForObject("SELECT email FROM users WHERE id = ?", String.class, account.id());
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(email, "long-enough-test-password"))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("accessToken").asText();
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private record Account(String token, UUID id) {
    }
}
