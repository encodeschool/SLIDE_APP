package com.slideforge.api.marketplace;

import java.util.List;

public record CatalogPageResponse(List<CatalogItemResponse> items, int page, int size, long total) {
}
