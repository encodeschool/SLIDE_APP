package com.slideforge.api.admin;

import com.slideforge.api.auth.RefreshTokenRepository;
import com.slideforge.api.auth.AuthService;
import com.slideforge.api.common.ApiException;
import com.slideforge.api.users.UserAccount;
import com.slideforge.api.users.UserRepository;
import com.slideforge.api.users.UserRole;
import com.slideforge.api.users.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {
    private static final Logger AUDIT = LoggerFactory.getLogger("com.slideforge.api.admin.audit");

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthService authService;
    private final Clock clock;

    public AdminUserService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            AuthService authService,
            Clock clock) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.authService = authService;
        this.clock = clock;
    }

    public void inviteAdmin(AdminInvitationRequest request) {
        authService.inviteAdmin(request.email(), request.displayName(), request.locale());
    }

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> search(String search, UserStatus status, Pageable pageable) {
        String normalizedSearch = search == null || search.isBlank() ? null : search.strip();
        Specification<UserAccount> criteria = (root, query, builder) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }
            if (normalizedSearch != null) {
                String pattern = "%" + normalizedSearch.toLowerCase(java.util.Locale.ROOT) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("email")), pattern),
                        builder.like(builder.lower(root.get("displayName")), pattern)));
            }
            return builder.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        return userRepository.findAll(criteria, pageable).map(AdminUserResponse::from);
    }

    @Transactional
    public AdminUserResponse disable(UUID actorId, UUID targetId) {
        if (actorId.equals(targetId)) {
            throw new ApiException(HttpStatus.CONFLICT, "SELF_DISABLE_NOT_ALLOWED", "Administrators cannot disable their own account");
        }

        // Lock admin rows in a stable order so simultaneous operations cannot remove the last active admin.
        var admins = userRepository.lockAccountsWithRole(UserRole.ADMIN.name());
        UserAccount target = userRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User was not found"));
        if (target.getStatus() == UserStatus.DELETED) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_CANNOT_BE_DISABLED", "Deleted accounts cannot be disabled");
        }
        if (target.getStatus() != UserStatus.BLOCKED) {
            if (target.getStatus() == UserStatus.ACTIVE && target.getRoles().contains(UserRole.ADMIN)
                    && admins.stream().filter(user -> user.getStatus() == UserStatus.ACTIVE).count() <= 1) {
                throw new ApiException(HttpStatus.CONFLICT, "LAST_ACTIVE_ADMIN", "The last active administrator cannot be disabled");
            }
            Instant now = clock.instant();
            target.updateStatus(UserStatus.BLOCKED, now);
            userRepository.save(target);
            refreshTokenRepository.revokeAllForUser(targetId, now);
            AUDIT.info("admin_user_disabled actorId={} targetId={}", actorId, targetId);
        }
        return AdminUserResponse.from(target);
    }

    @Transactional
    public AdminUserResponse enable(UUID actorId, UUID targetId) {
        UserAccount target = userRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User was not found"));
        if (target.getStatus() == UserStatus.DELETED) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_CANNOT_BE_ENABLED", "Deleted accounts cannot be enabled");
        }
        if (target.getStatus() == UserStatus.BLOCKED) {
            target.updateStatus(UserStatus.ACTIVE, clock.instant());
            userRepository.save(target);
            AUDIT.info("admin_user_enabled actorId={} targetId={}", actorId, targetId);
        }
        return AdminUserResponse.from(target);
    }
}
