package com.slideforge.api.artifacts;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record ArtifactResponse(
        UUID id,
        String type,
        String title,
        String language,
        int currentVersion,
        int version,
        Instant createdAt,
        Instant updatedAt,
        JsonNode document) {}
