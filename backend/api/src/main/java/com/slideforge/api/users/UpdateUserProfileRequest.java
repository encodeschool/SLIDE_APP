package com.slideforge.api.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
        @NotBlank @Size(max = 120) String displayName,
        @NotBlank @Pattern(regexp = "en|ru") String locale) {
}