package com.slideforge.api.generations;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateGenerationRequest(
        @NotBlank @Size(max = 4000) String prompt,
        @NotNull @Pattern(regexp = "en|ru|uz") String language,
        @Min(1) @Max(20) int slideCount) {
}
