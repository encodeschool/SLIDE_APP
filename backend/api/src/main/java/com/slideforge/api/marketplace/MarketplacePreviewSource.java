package com.slideforge.api.marketplace;

import java.nio.file.Path;

public record MarketplacePreviewSource(Path path, String extension, String objectKey) {
}
