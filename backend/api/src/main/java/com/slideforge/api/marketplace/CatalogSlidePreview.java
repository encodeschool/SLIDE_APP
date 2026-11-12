package com.slideforge.api.marketplace;

import java.util.List;

public record CatalogSlidePreview(
        int slideNumber, String title, List<String> text, String backgroundColor, String accentColor) {
}
