package com.slideforge.api.exports;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
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
}