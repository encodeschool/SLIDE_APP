package com.slideforge.api.marketplace;

public record AdminMarketplaceCategoryResponse(
        String slug, String nameEn, String nameRu, String nameUz, boolean active) {}
