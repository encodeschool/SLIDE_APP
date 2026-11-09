package com.slideforge.api.generations;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record GenerationJobResponse(
        UUID id,
        String status,
        String language,
        int slideCount,
        String failureCode,
        String failureMessage,
        JsonNode document,
        Instant createdAt,
        Instant updatedAt) {

    public static GenerationJobResponse from(GenerationJob job) {
        String failureMessage = switch (job.getFailureCode() == null ? "" : job.getFailureCode()) {
            case "AI_PROVIDER_UNCONFIGURED" -> "AI generation is not configured on this server.";
            case "AI_PROVIDER_TIMEOUT" -> "The AI provider timed out. Please try again.";
            case "GENERATED_DECK_INVALID" -> "The AI provider returned an invalid presentation.";
            case "GENERATION_INTERRUPTED" -> "Generation was interrupted. Please try again.";
            default -> job.getFailureCode() == null ? null : "Generation failed. Please try again.";
        };
        return new GenerationJobResponse(
                job.getId(),
                job.getStatus().name(),
                job.getLanguage(),
                job.getSlideCount(),
                job.getFailureCode(),
                failureMessage,
                job.getResultDocument(),
                job.getCreatedAt(),
                job.getUpdatedAt());
    }
}
