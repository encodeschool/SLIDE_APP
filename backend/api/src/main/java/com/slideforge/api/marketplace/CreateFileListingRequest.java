package com.slideforge.api.marketplace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public record CreateFileListingRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Pattern(regexp = "presentation|document|coursework|worksheet|design|other") String workType,
        @NotNull @Positive Long priceTiyin,
        @NotBlank @Size(max = 20000) String description,
        @NotBlank @Size(max = 20000) String licenseTerms,
        @Size(max = 40) String category,
        @NotNull MultipartFile file) {
}
