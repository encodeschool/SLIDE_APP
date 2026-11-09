package com.slideforge.api.auth;

public record AuthActionResponse(String message) {
    public static final AuthActionResponse GENERIC =
            new AuthActionResponse("If the account is eligible, instructions will be sent.");
}
