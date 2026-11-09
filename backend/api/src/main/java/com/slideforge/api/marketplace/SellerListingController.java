package com.slideforge.api.marketplace;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/seller/listings")
public class SellerListingController {
    private final MarketplaceService marketplaceService;

    public SellerListingController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    @PostMapping
    public ResponseEntity<ListingResponse> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateListingRequest request) {
        ListingResponse listing = marketplaceService.createDraft(userId(jwt), request);
        return ResponseEntity.created(URI.create("/api/v1/seller/listings/" + listing.id())).body(listing);
    }

    @PutMapping("/{listingId}")
    public ListingResponse updateDraft(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID listingId,
            @Valid @RequestBody UpdateDraftListingRequest request) {
        return marketplaceService.updateDraft(userId(jwt), listingId, request);
    }

    @PostMapping("/{listingId}/publish")
    public ListingResponse publish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID listingId) {
        return marketplaceService.publish(userId(jwt), listingId);
    }

    @DeleteMapping("/{listingId}")
    public ListingResponse archive(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID listingId) {
        return marketplaceService.archive(userId(jwt), listingId);
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
