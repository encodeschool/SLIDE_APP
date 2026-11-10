package com.slideforge.api.marketplace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AdminListingStatusRequest(
        @NotBlank @Pattern(regexp = "PUBLISHED|SUSPENDED|REJECTED") String status) {
}
