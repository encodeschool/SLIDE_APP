package com.slideforge.api.marketplace;

import java.time.Instant;
import java.util.UUID;

public record ListingDetailResponse(
        UUID listingId,
        UUID listingVersionId,
        String title,
        String description,
        String licenseTerms,
        UUID sellerId,
        String sellerName,
        int version,
        long priceTiyin,
        String currency,
        String category,
        Instant publishedAt) {
}
