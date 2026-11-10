package com.slideforge.api.marketplace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateListingRequest(
        @NotNull UUID presentationId,
        @Positive int presentationVersion,
        @NotNull @Positive Long priceTiyin,
        @NotBlank @Size(max = 20000) String description,
        @NotBlank @Size(max = 20000) String licenseTerms,
        @Size(max = 40) String category) {

    public CreateListingRequest(
            UUID presentationId, int presentationVersion, Long priceTiyin, String description, String licenseTerms) {
        this(presentationId, presentationVersion, priceTiyin, description, licenseTerms, "other");
    }
}
