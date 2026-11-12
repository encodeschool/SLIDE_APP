package com.slideforge.api.admin.dto;

import com.slideforge.api.users.model.UserAccount;
import com.slideforge.api.users.model.UserRole;
import com.slideforge.api.users.model.UserStatus;
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
