package com.slideforge.api.users.controller;

import com.slideforge.api.common.exception.ApiException;
import com.slideforge.api.users.dto.UpdateUserProfileRequest;
import com.slideforge.api.users.dto.UserProfileResponse;
import com.slideforge.api.users.model.UserAccount;
import com.slideforge.api.users.model.UserStatus;
import com.slideforge.api.users.repository.UserRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class CurrentUserController {
    private final UserRepository userRepository;

    public CurrentUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public UserProfileResponse getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UserAccount user = userRepository.findById(userId)
                .filter(account -> account.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "ACCOUNT_UNAVAILABLE", "This account is not available"));
        return UserProfileResponse.from(user);
    }

    @PutMapping("/me")
    public UserProfileResponse updateCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateUserProfileRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UserAccount user = userRepository.findById(userId)
                .filter(account -> account.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "ACCOUNT_UNAVAILABLE", "This account is not available"));
        user.updateProfile(request.displayName().strip(), request.locale(), Instant.now());
        return UserProfileResponse.from(userRepository.save(user));
    }
}