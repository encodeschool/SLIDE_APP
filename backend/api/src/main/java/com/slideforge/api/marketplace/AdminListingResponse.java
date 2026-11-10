package com.slideforge.api.marketplace;

import java.time.Instant;
import java.util.UUID;

public record AdminListingResponse(
        UUID id,
        String title,
        String description,
        String status,
        String sellerName,
        String sellerEmail,
        String category,
        int currentVersion,
        long priceTiyin,
        String currency,
        Instant updatedAt) {
}
