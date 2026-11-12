package com.slideforge.api.marketplace;

import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/purchases")
public class PurchaseController {
    private final MarketplaceService marketplaceService;

    public PurchaseController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
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

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
