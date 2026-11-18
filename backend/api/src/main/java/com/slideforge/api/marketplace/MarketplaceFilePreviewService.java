package com.slideforge.api.marketplace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.common.exception.ApiException;
import com.slideforge.api.exports.RendererClient;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class MarketplaceFilePreviewService {
    private static final Logger logger = LoggerFactory.getLogger(MarketplaceFilePreviewService.class);
    private static final int MAX_PREVIEW_PAGES = 2;
    private static final int MAX_PREVIEW_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final byte[] PNG_SIGNATURE = new byte[] {
        (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    };

    private final MarketplaceService marketplaceService;
    private final MarketplaceFileStorage fileStorage;
    private final RendererClient rendererClient;
    private final ObjectMapper objectMapper;

    public MarketplaceFilePreviewService(
            MarketplaceService marketplaceService,
            MarketplaceFileStorage fileStorage,
            RendererClient rendererClient,
            ObjectMapper objectMapper) {
        this.marketplaceService = marketplaceService;
        this.fileStorage = fileStorage;
        this.rendererClient = rendererClient;
        this.objectMapper = objectMapper;
    }

    public MarketplaceFilePreviewResponse preview(UUID listingId) {
        MarketplacePreviewSource source = marketplaceService.catalogFilePreviewSource(listingId);
        byte[] cached = fileStorage.readPreviewCache(source.objectKey());
        if (cached != null) return decodeCached(cached);

        byte[] rendered;
        try {
            rendered = rendererClient.renderMarketplacePreview(source.path(), source.extension());
        } catch (RestClientResponseException exception) {
            logger.warn(
                    "Marketplace preview renderer rejected listing {} with HTTP {}",
                    listingId,
                    exception.getStatusCode().value());
            HttpStatus status = exception.getStatusCode().is5xxServerError()
                    ? HttpStatus.SERVICE_UNAVAILABLE
                    : HttpStatus.UNPROCESSABLE_ENTITY;
            throw new ApiException(status, "FILE_PREVIEW_UNAVAILABLE", "A preview is not available for this file");
        } catch (ResourceAccessException exception) {
            logger.error("Marketplace preview renderer is unavailable for listing {}", listingId, exception);
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "FILE_PREVIEW_UNAVAILABLE",
                    "A preview is temporarily unavailable");
        }

        MarketplaceFilePreviewResponse response = decodeRendererResponse(rendered);
        fileStorage.writePreviewCache(source.objectKey(), rendered);
        return response;
    }

    private MarketplaceFilePreviewResponse decodeCached(byte[] cached) {
        try {
            return validate(objectMapper.readTree(cached));
        } catch (IOException exception) {
            throw new IllegalStateException("Cached marketplace preview is invalid", exception);
        }
    }

    private MarketplaceFilePreviewResponse decodeRendererResponse(byte[] rendered) {
        try {
            return validate(objectMapper.readTree(rendered));
        } catch (IOException exception) {
            throw new IllegalStateException("Marketplace preview renderer returned invalid JSON", exception);
        }
    }

    private MarketplaceFilePreviewResponse validate(JsonNode root) {
        int totalPages = root.path("totalPages").asInt(-1);
        JsonNode pagesNode = root.path("pages");
        if (totalPages < 1 || totalPages > 500 || !pagesNode.isArray()
                || pagesNode.isEmpty() || pagesNode.size() > Math.min(totalPages, MAX_PREVIEW_PAGES)) {
            throw new IllegalStateException("Marketplace preview response has invalid page metadata");
        }
        List<MarketplaceFilePreviewPage> pages = new ArrayList<>(pagesNode.size());
        for (JsonNode page : pagesNode) {
            int pageNumber = page.path("pageNumber").asInt(-1);
            if (pageNumber != pages.size() + 1 || pageNumber > totalPages
                    || !"image/png".equals(page.path("contentType").asText())) {
                throw new IllegalStateException("Marketplace preview response contains an invalid page");
            }
            byte[] image;
            try {
                image = Base64.getDecoder().decode(page.path("data").asText());
            } catch (IllegalArgumentException exception) {
                throw new IllegalStateException("Marketplace preview page is not valid base64", exception);
            }
            if (image.length < PNG_SIGNATURE.length || image.length > MAX_PREVIEW_IMAGE_BYTES
                    || !startsWith(image, PNG_SIGNATURE)) {
                throw new IllegalStateException("Marketplace preview page is not a supported PNG image");
            }
            pages.add(new MarketplaceFilePreviewPage(
                    pageNumber, "data:image/png;base64," + Base64.getEncoder().encodeToString(image)));
        }
        return new MarketplaceFilePreviewResponse(totalPages, List.copyOf(pages));
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        for (int index = 0; index < prefix.length; index++) {
            if (value[index] != prefix[index]) return false;
        }
        return true;
    }
}
