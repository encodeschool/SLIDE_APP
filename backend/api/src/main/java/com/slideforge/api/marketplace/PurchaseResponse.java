package com.slideforge.api.marketplace;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PurchaseResponse(
        UUID entitlementId,
        UUID listingId,
        UUID listingVersionId,
        UUID orderId,
        String title,
        String sellerName,
        long priceTiyin,
        String currency,
        Instant purchasedAt,
        String workType,
        String fileName,
        long fileSize,
        boolean hasDownloadableFile,
        int slideCount,
        List<CatalogSlidePreview> previewSlides) {
}
