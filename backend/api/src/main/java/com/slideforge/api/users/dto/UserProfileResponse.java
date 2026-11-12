package com.slideforge.api.users.dto;

import com.slideforge.api.users.model.UserAccount;
import com.slideforge.api.users.model.UserRole;
import java.util.List;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String displayName,
        String locale,
        boolean emailVerified,
        List<String> roles) {
    public static UserProfileResponse from(UserAccount user) {
        List<String> roles = user.getRoles().stream().map(UserRole::name).sorted().toList();
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getLocale(),
                user.isEmailVerified(),
                roles);
    }
}