package com.slideforge.api.marketplace;

import java.time.Instant;
import java.util.UUID;

public record ListingResponse(
        UUID id,
        String title,
        String description,
        String status,
        int currentVersion,
        long priceTiyin,
        String currency,
        Instant createdAt,
        Instant updatedAt) {
}
