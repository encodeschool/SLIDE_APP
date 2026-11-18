package com.slideforge.api.exports;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RendererClient {
    private final RestClient restClient;

    public RendererClient(RestClient.Builder builder, @Value("${app.exports.renderer-url}") String rendererUrl) {
        this.restClient = builder.baseUrl(rendererUrl).build();
    }

    public byte[] render(JsonNode document, ExportFormat format) {
        byte[] output = restClient.post()
                .uri("/render/{format}", format.rendererPath())
                .contentType(MediaType.APPLICATION_JSON)
                .body(document)
                .retrieve()
                .body(byte[].class);
        if (output == null || output.length == 0) {
            throw new IllegalStateException("Renderer returned an empty export");
        }
        return output;
    }

    public byte[] renderArtifact(JsonNode document, String format) {
        byte[] output = restClient.post()
                .uri("/render/artifact/{format}", format)
                .contentType(MediaType.APPLICATION_JSON)
                .body(document)
                .retrieve()
                .body(byte[].class);
        if (output == null || output.length == 0) {
            throw new IllegalStateException("Renderer returned an empty artifact export");
        }
        return output;
    }

    public byte[] renderMarketplacePreview(Path file, String extension) {
        byte[] output = restClient.post()
                .uri("/render/marketplace-preview/{extension}", extension)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new FileSystemResource(file))
                .retrieve()
                .body(byte[].class);
        if (output == null || output.length == 0) {
            throw new IllegalStateException("Renderer returned an empty marketplace preview");
        }
        return output;
    }
}