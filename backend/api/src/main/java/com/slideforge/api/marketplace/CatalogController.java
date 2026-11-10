package com.slideforge.api.marketplace;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogController {
    private final MarketplaceService marketplaceService;

    public CatalogController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    @GetMapping
    public CatalogPageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String category) {
        return marketplaceService.catalog(page, size, category);
    }

    @GetMapping("/categories")
    public List<MarketplaceCategoryResponse> categories() {
        return marketplaceService.categories();
    }

    @GetMapping("/{listingId}")
    public ListingDetailResponse detail(@PathVariable UUID listingId) {
        return marketplaceService.catalogListing(listingId);
    }

    @GetMapping("/preferences")
    public MarketplacePreferenceResponse preference(@AuthenticationPrincipal Jwt jwt) {
        return marketplaceService.preference(UUID.fromString(jwt.getSubject()));
    }

    @PutMapping("/preferences")
    public MarketplacePreferenceResponse updatePreference(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MarketplacePreferenceRequest request) {
        return marketplaceService.updatePreference(UUID.fromString(jwt.getSubject()), request);
    }
}
