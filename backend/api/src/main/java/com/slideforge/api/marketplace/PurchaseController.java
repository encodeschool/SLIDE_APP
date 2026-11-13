package com.slideforge.api.marketplace;

import java.util.List;
import java.util.UUID;
import java.net.URI;
import jakarta.validation.Valid;
import com.slideforge.api.exports.CreateExportRequest;
import com.slideforge.api.exports.ExportJobResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/purchases")
public class PurchaseController {
    private final MarketplaceService marketplaceService;
    private final PurchaseExportService purchaseExportService;

    public PurchaseController(MarketplaceService marketplaceService, PurchaseExportService purchaseExportService) {
        this.marketplaceService = marketplaceService;
        this.purchaseExportService = purchaseExportService;
    }

    @GetMapping
    public List<PurchaseResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return marketplaceService.purchases(userId(jwt));
    }

    @GetMapping("/{entitlementId}/content")
    public PurchaseContentResponse content(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID entitlementId) {
        return marketplaceService.purchasedContent(userId(jwt), entitlementId);
    }

    @PostMapping("/{entitlementId}/exports")
    public ResponseEntity<ExportJobResponse> export(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID entitlementId,
            @Valid @RequestBody CreateExportRequest request) {
        ExportJobResponse job = purchaseExportService.enqueue(userId(jwt), entitlementId, request);
        return ResponseEntity.accepted()
                .location(URI.create("/api/v1/exports/" + job.id()))
                .body(job);
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
