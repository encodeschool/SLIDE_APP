package com.slideforge.api.marketplace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateMarketplaceCategoryRequest(
        @NotBlank @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") @Size(max = 40) String slug,
        @NotBlank @Size(max = 80) String nameEn,
        @NotBlank @Size(max = 80) String nameRu,
        @NotBlank @Size(max = 80) String nameUz) {}
