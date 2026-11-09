package com.slideforge.api.marketplace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdateDraftListingRequest(
        @Positive int expectedVersion,
        @NotNull @Positive Long priceTiyin,
        @NotBlank @Size(max = 20000) String description,
        @NotBlank @Size(max = 20000) String licenseTerms) {
}
