package com.slideforge.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthActionRequest(@NotBlank @Email @Size(max = 255) String email) {
}
