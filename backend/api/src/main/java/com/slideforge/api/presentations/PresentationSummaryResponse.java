package com.slideforge.api.presentations;

import java.time.Instant;
import java.util.UUID;

public record PresentationSummaryResponse(
        UUID id,
        String title,
        String language,
        PresentationStatus status,
        int currentVersion,
        Instant createdAt,
        Instant updatedAt) {
    public static PresentationSummaryResponse from(Presentation presentation) {
        return new PresentationSummaryResponse(
                presentation.getId(),
                presentation.getTitle(),
                presentation.getLanguage(),
                presentation.getStatus(),
                presentation.getCurrentVersion(),
                presentation.getCreatedAt(),
                presentation.getUpdatedAt());
    }
}