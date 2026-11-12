package com.slideforge.api.auth;

import com.slideforge.api.users.dto.UserProfileResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final String REFRESH_COOKIE_NAME = "slideforge_refresh";
    private static final String REFRESH_COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final boolean secureCookie;
    private final Duration refreshCookieTtl;

    public AuthController(
            AuthService authService,
            @Value("${app.auth.refresh-cookie-secure}") boolean secureCookie,
            @Value("${app.auth.refresh-token-ttl-days}") long refreshTokenTtlDays) {
        this.authService = authService;
        this.secureCookie = secureCookie;
        this.refreshCookieTtl = Duration.ofDays(refreshTokenTtlDays);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthActionResponse> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(201).body(AuthActionResponse.GENERIC);
    }

    @PostMapping("/admin-invitation/complete")
    public ResponseEntity<Void> completeAdminInvitation(
            @Valid @RequestBody AdminInvitationCompletionRequest request) {
        authService.completeAdminInvitation(request.token(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin-invitation/request")
    public AuthActionResponse requestAdminInvitation(@Valid @RequestBody AuthActionRequest request) {
        authService.requestAdminInvitation(request.email());
        return AuthActionResponse.GENERIC;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return issueSession(authService.login(request), 200);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.<AuthResponse>noContent().build();
        }
        return issueSession(authService.refresh(refreshToken), 200);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString()).build();
    }

    @PostMapping("/verify")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody TokenRequest request) {
        authService.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify/request")
    public AuthActionResponse requestEmailVerification(@Valid @RequestBody AuthActionRequest request) {
        authService.requestEmailVerification(request.email());
        return AuthActionResponse.GENERIC;
    }

    @PostMapping("/password/forgot")
    public AuthActionResponse requestPasswordRecovery(@Valid @RequestBody AuthActionRequest request) {
        authService.requestPasswordRecovery(request.email());
        return AuthActionResponse.GENERIC;
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<AuthResponse> issueSession(SessionTokens session, int status) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, session.refreshToken())
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(refreshCookieTtl)
                .build();
        AuthResponse body = new AuthResponse(
                UserProfileResponse.from(session.user()),
                session.accessToken(),
                session.accessTokenTtlSeconds());
        return ResponseEntity.status(status).header(HttpHeaders.SET_COOKIE, cookie.toString()).body(body);
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(Duration.ZERO)
                .build();
    }
}