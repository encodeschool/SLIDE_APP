package com.slideforge.api.marketplace;

import java.util.List;

public record AdminListingPageResponse(List<AdminListingResponse> items, int page, int size, long total) {
}
