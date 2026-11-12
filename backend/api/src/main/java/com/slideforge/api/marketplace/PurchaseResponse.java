package com.slideforge.api.marketplace;

import java.time.Instant;
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
        Instant purchasedAt) {
}
