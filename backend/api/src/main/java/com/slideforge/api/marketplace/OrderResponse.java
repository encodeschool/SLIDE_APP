package com.slideforge.api.marketplace;

import java.time.Instant;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        String status,
        long totalTiyin,
        String currency,
        UUID listingVersionId,
        Instant createdAt) {
}
