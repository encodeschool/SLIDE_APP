package com.slideforge.api.marketplace;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/marketplace/listings")
public class AdminMarketplaceController {
    private final MarketplaceService marketplaceService;

    public AdminMarketplaceController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    @GetMapping
    public AdminListingPageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return marketplaceService.adminListings(page, size);
    }

    @PatchMapping("/{listingId}/status")
    public AdminListingResponse updateStatus(
            @PathVariable UUID listingId, @Valid @RequestBody AdminListingStatusRequest request) {
        return marketplaceService.adminUpdateListingStatus(listingId, request.status());
    }
}
