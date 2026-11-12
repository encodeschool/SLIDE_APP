package com.slideforge.api.marketplace;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CatalogItemResponse(
        UUID listingId,
        UUID listingVersionId,
        String title,
        String description,
        UUID sellerId,
        int version,
        long priceTiyin,
        String currency,
        Instant publishedAt,
        String category,
        String sellerName,
        List<CatalogSlidePreview> previewSlides) {
}
