package com.slideforge.api.marketplace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.common.exception.ApiException;
import com.slideforge.api.exports.CreateExportRequest;
import com.slideforge.api.exports.ExportJobResponse;
import com.slideforge.api.exports.ExportJobService;
import com.slideforge.api.presentations.CreatePresentationRequest;
import com.slideforge.api.presentations.PresentationDetailResponse;
import com.slideforge.api.presentations.PresentationService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseExportService {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final PresentationService presentationService;
    private final ExportJobService exportJobService;

    public PurchaseExportService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            PresentationService presentationService,
            ExportJobService exportJobService) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.presentationService = presentationService;
        this.exportJobService = exportJobService;
    }

    @Transactional
    public ExportJobResponse enqueue(UUID buyerId, UUID entitlementId, CreateExportRequest request) {
        List<PurchaseExportSource> sources = jdbcTemplate.query(
                """
                SELECT e.copied_presentation_id, lv.title, lv.document::text AS document
                FROM entitlements e
                JOIN orders o ON o.id = e.order_id AND o.status = 'PAID'
                JOIN listing_versions lv ON lv.id = e.listing_version_id
                WHERE e.id = ? AND e.user_id = ? AND e.revoked_at IS NULL
                  AND lv.document IS NOT NULL
                FOR UPDATE OF e
                """,
                (rs, row) -> new PurchaseExportSource(
                        rs.getObject("copied_presentation_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("document")),
                entitlementId,
                buyerId);
        if (sources.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PURCHASE_NOT_FOUND", "Purchase was not found");
        }

        PurchaseExportSource source = sources.getFirst();
        UUID presentationId = source.copiedPresentationId();
        if (presentationId == null || !ownedPresentationExists(presentationId, buyerId)) {
            JsonNode document = decodeDocument(source.document());
            String language = document.path("language").asText("en");
            PresentationDetailResponse copy = presentationService.create(
                    buyerId,
                    new CreatePresentationRequest(source.title(), language, document));
            presentationId = copy.id();
            int updated = jdbcTemplate.update(
                    "UPDATE entitlements SET copied_presentation_id = ? WHERE id = ? AND user_id = ?",
                    presentationId,
                    entitlementId,
                    buyerId);
            if (updated != 1) {
                throw new IllegalStateException("Purchased presentation copy could not be linked to its entitlement");
            }
        }

        return exportJobService.enqueue(
                buyerId,
                presentationId,
                new CreateExportRequest(request.format(), 1));
    }

    private boolean ownedPresentationExists(UUID presentationId, UUID ownerId) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM presentations WHERE id = ? AND owner_id = ? AND deleted_at IS NULL)",
                Boolean.class,
                presentationId,
                ownerId);
        return Boolean.TRUE.equals(exists);
    }

    private JsonNode decodeDocument(String serialized) {
        try {
            return objectMapper.readTree(serialized);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored purchased presentation could not be decoded", exception);
        }
    }

    private record PurchaseExportSource(UUID copiedPresentationId, String title, String document) {
    }
}
