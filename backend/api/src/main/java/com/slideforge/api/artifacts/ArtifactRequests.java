package com.slideforge.api.artifacts;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ArtifactRequests {
    private ArtifactRequests() {}

    public record Create(
            @NotBlank @Pattern(regexp = "essay|independent-work|coursework|dissertation|research-article|quiz|crossword|thesis-abstract|glossary|argumentative-essay") String type,
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Pattern(regexp = "en|ru|uz") String language,
            @NotNull JsonNode document) {}

    public record Save(@NotNull Integer expectedVersion, @NotNull JsonNode document) {}

    public record Draft(
            @NotBlank @Pattern(regexp = "essay|independent-work|coursework|dissertation|research-article|quiz|crossword|thesis-abstract|glossary|argumentative-essay") String type,
            @NotBlank @Size(max = 4000) String prompt,
            @NotBlank @Pattern(regexp = "en|ru|uz") String language,
            @Min(1) @Max(20) Integer itemCount) {
        public Draft(String type, String prompt, String language) {
            this(type, prompt, language, 5);
        }
    }
}
