package com.slideforge.api.marketplace;

import java.nio.file.Path;

public record PurchasedFileDownload(Path path, String fileName, long sizeBytes) {
}
