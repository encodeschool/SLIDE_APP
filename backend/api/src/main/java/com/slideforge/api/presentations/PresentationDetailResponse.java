package com.slideforge.api.presentations;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record PresentationDetailResponse(
        UUID id,
        String title,
        String language,
        PresentationStatus status,
        int currentVersion,
        Instant createdAt,
        Instant updatedAt,
        JsonNode document) {
}