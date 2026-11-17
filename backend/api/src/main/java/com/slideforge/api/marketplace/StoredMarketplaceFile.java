package com.slideforge.api.marketplace;

public record StoredMarketplaceFile(
        String objectKey,
        String fileName,
        long sizeBytes,
        String sha256) {
}
