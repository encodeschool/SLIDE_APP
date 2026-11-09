package com.slideforge.api.admin;

import com.slideforge.api.users.UserAccount;
import com.slideforge.api.users.UserRole;
import com.slideforge.api.users.UserStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String email,
        String displayName,
        String locale,
        boolean emailVerified,
        UserStatus status,
        List<String> roles,
        Instant createdAt,
        Instant updatedAt) {
    public static AdminUserResponse from(UserAccount user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getLocale(),
                user.isEmailVerified(),
                user.getStatus(),
                user.getRoles().stream().map(UserRole::name).sorted().toList(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
