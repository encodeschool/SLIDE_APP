package com.slideforge.api.auth;

import com.slideforge.api.users.model.UserAccount;

public record SessionTokens(UserAccount user, String accessToken, String refreshToken, long accessTokenTtlSeconds) {
}