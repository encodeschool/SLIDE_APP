package com.slideforge.api.presentations;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SavePresentationRequest(
        @Min(1) int expectedVersion,
        @NotNull JsonNode document) {
}