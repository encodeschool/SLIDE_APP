package com.slideforge.api.auth;

import com.slideforge.api.users.UserProfileResponse;

public record AuthResponse(UserProfileResponse user, String accessToken, long expiresInSeconds) {
}