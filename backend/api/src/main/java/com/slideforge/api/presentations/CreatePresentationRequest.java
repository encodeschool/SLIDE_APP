package com.slideforge.api.presentations;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreatePresentationRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Pattern(regexp = "en|ru|uz") String language,
        @NotNull JsonNode document) {
}