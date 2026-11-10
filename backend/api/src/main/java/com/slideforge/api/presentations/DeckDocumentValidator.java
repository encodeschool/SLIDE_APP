package com.slideforge.api.presentations;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.slideforge.api.common.ApiException;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class DeckDocumentValidator {
    private static final int MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
    private static final int MAX_SLIDES = 150;
    private static final int MAX_ELEMENTS_PER_SLIDE = 100;

    private final ObjectMapper objectMapper;

    public DeckDocumentValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JsonNode normalize(JsonNode source, UUID presentationId, String requestedTitle, String requestedLanguage) {
        if (source == null || !source.isObject() || source.path("schemaVersion").asInt(-1) != 1) {
            throw invalidDocument("Only object documents with schemaVersion 1 are supported");
        }
        if (!source.path("title").isTextual() || !source.path("language").isTextual()) {
            throw invalidDocument("Document title and language are required");
        }
        String title = source.path("title").asText().strip();
        String language = source.path("language").asText();
        if (title.isBlank() || title.length() > 200 || !title.equals(requestedTitle.strip())) {
            throw invalidDocument("Document title must match the requested title and be at most 200 characters");
        }
        if (!(language.equals("en") || language.equals("ru") || language.equals("uz"))
                || !language.equals(requestedLanguage)) {
            throw invalidDocument("Document language must match the requested supported language");
        }

        JsonNode size = source.path("size");
        double width = finiteNumber(size.path("width"));
        double height = finiteNumber(size.path("height"));
        if (width < 1 || height < 1 || width > 20000 || height > 20000) {
            throw invalidDocument("Slide dimensions must be between 1 and 20000 pixels");
        }

        JsonNode slides = source.path("slides");
        if (!slides.isArray() || slides.isEmpty() || slides.size() > MAX_SLIDES) {
            throw invalidDocument("A presentation must contain between 1 and 150 slides");
        }
        for (JsonNode slide : slides) {
            validateSlide(slide, width, height);
        }

        if (serializedSize(source) > MAX_DOCUMENT_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "DOCUMENT_TOO_LARGE", "Presentation document exceeds 5 MB");
        }
        ObjectNode normalized = ((ObjectNode) source).deepCopy();
        normalized.put("id", presentationId.toString());
        return normalized;
    }

    public String title(JsonNode document) {
        return document.path("title").asText();
    }

    public String language(JsonNode document) {
        return document.path("language").asText();
    }

    private void validateSlide(JsonNode slide, double width, double height) {
        if (!slide.isObject() || !slide.path("id").isTextual()) {
            throw invalidDocument("Each slide must have a stable string id");
        }
        JsonNode elements = slide.path("elements");
        if (!elements.isArray() || elements.size() > MAX_ELEMENTS_PER_SLIDE) {
            throw invalidDocument("Each slide must contain at most 100 elements");
        }
        Set<String> elementIds = new HashSet<>();
        for (JsonNode element : elements) {
            validateElement(element, width, height, elementIds);
        }
    }

    private void validateElement(JsonNode element, double slideWidth, double slideHeight, Set<String> elementIds) {
        String id = element.path("id").asText("");
        String type = element.path("type").asText("");
        if (!element.isObject() || id.isBlank() || !elementIds.add(id)) {
            throw invalidDocument("Each slide element must have a unique, non-empty id");
        }
        if (!(type.equals("text") || type.equals("shape") || type.equals("image"))) {
            throw invalidDocument("Unsupported slide element type");
        }
        double x = finiteNumber(element.path("x"));
        double y = finiteNumber(element.path("y"));
        double elementWidth = finiteNumber(element.path("w"));
        double elementHeight = finiteNumber(element.path("h"));
        if (x < 0 || y < 0 || elementWidth <= 0 || elementHeight <= 0
                || x + elementWidth > slideWidth || y + elementHeight > slideHeight) {
            throw invalidDocument("Slide element geometry must stay within the slide bounds");
        }
        if (type.equals("text") && !element.path("text").isTextual()) {
            throw invalidDocument("Text elements require a string value");
        }
        if (type.equals("shape")
                && !(element.path("shape").asText().equals("rect") || element.path("shape").asText().equals("ellipse"))) {
            throw invalidDocument("Unsupported shape type");
        }
        if (type.equals("image") && !element.path("dataUri").asText().matches("^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$")) {
            throw invalidDocument("Images must use a supported base64 image data URI");
        }
    }

    private double finiteNumber(JsonNode node) {
        if (!node.isNumber()) {
            throw invalidDocument("Slide geometry values must be numbers");
        }
        double value = node.asDouble();
        if (!Double.isFinite(value)) {
            throw invalidDocument("Slide geometry values must be finite");
        }
        return value;
    }

    private int serializedSize(JsonNode document) {
        try {
            return objectMapper.writeValueAsBytes(document).length;
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw invalidDocument("Presentation document could not be processed");
        }
    }

    private ApiException invalidDocument(String detail) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRESENTATION", detail);
    }
}