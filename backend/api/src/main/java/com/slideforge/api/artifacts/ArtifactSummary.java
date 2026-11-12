package com.slideforge.api.artifacts;

import java.time.Instant;
import java.util.UUID;

public record ArtifactSummary(
        UUID id,
        String type,
        String title,
        String language,
        int currentVersion,
        Instant createdAt,
        Instant updatedAt) {}
