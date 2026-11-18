package com.slideforge.api.marketplace;

import java.util.List;

public record MarketplaceFilePreviewResponse(int totalPages, List<MarketplaceFilePreviewPage> pages) {
}
