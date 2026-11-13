package com.slideforge.api.auth;

import com.slideforge.api.common.exception.ApiException;
import com.slideforge.api.users.model.UserAccount;
import com.slideforge.api.users.repository.UserRepository;
import com.slideforge.api.users.model.UserRole;
import com.slideforge.api.users.model.UserStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthActionTokenRepository authActionTokenRepository;
    private final MailDelivery mailDelivery;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final Clock clock;
    private final Duration refreshTokenTtl;
    private final Duration emailVerificationTokenTtl;
    private final Duration passwordRecoveryTokenTtl;
    private final String fallbackPasswordHash;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            AuthActionTokenRepository authActionTokenRepository,
            MailDelivery mailDelivery,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            Clock clock,
            @Value("${app.auth.refresh-token-ttl-days}") long refreshTokenTtlDays,
            @Value("${app.auth.email-verification-token-ttl-hours:24}") long emailVerificationTtlHours,
            @Value("${app.auth.password-recovery-token-ttl-minutes:30}") long passwordRecoveryTtlMinutes) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.authActionTokenRepository = authActionTokenRepository;
        this.mailDelivery = mailDelivery;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.clock = clock;
        this.refreshTokenTtl = Duration.ofDays(refreshTokenTtlDays);
        this.emailVerificationTokenTtl = Duration.ofHours(emailVerificationTtlHours);
        this.passwordRecoveryTokenTtl = Duration.ofMinutes(passwordRecoveryTtlMinutes);
        this.fallbackPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public void register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.findByEmail(email).isPresent()) {
            throw accountUnavailable();
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_LONG", "Password must not exceed 72 UTF-8 bytes");
        }

        Instant now = clock.instant();
        String locale = request.locale() == null || request.locale().isBlank() ? "en" : request.locale();
        UserAccount user = new UserAccount(
                email,
                passwordEncoder.encode(request.password()),
                request.displayName().strip(),
                locale,
                now);
        userRepository.saveAndFlush(user);
        issueActionToken(user, AuthActionToken.Purpose.EMAIL_VERIFICATION, now);
    }

    @Transactional
    public void inviteAdmin(String rawEmail, String displayName, String requestedLocale) {
        String email = normalizeEmail(rawEmail);
        if (userRepository.findByEmail(email).isPresent()) {
            throw accountUnavailable();
        }
        Instant now = clock.instant();
        String locale = requestedLocale == null || requestedLocale.isBlank() ? "en" : requestedLocale;
        UserAccount user = new UserAccount(
                email,
                passwordEncoder.encode(newActionToken()),
                displayName.strip(),
                locale,
                now);
        user.addRole(UserRole.ADMIN);
        userRepository.saveAndFlush(user);

        String rawToken = saveActionToken(user, AuthActionToken.Purpose.ADMIN_INVITATION, now);
        mailDelivery.sendAdminInvitation(email, rawToken);
    }

    @Transactional
    public void requestAdminInvitation(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            return;
        }
        userRepository.findByEmail(normalizeEmail(rawEmail))
                .filter(user -> user.getStatus() == UserStatus.ACTIVE
                        && !user.isEmailVerified()
                        && user.getRoles().contains(UserRole.ADMIN))
                .ifPresent(user -> {
                    String rawToken = saveActionToken(
                            user, AuthActionToken.Purpose.ADMIN_INVITATION, clock.instant());
                    try {
                        mailDelivery.sendAdminInvitation(user.getEmail(), rawToken);
                    } catch (RuntimeException ignored) {
                        // Keep the response identical for invited and unknown addresses.
                    }
                });
    }

    @Transactional
    public void completeAdminInvitation(String rawToken, String newPassword) {
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_LONG", "Password must not exceed 72 UTF-8 bytes");
        }
        AuthActionToken token = findUsableActionToken(rawToken, AuthActionToken.Purpose.ADMIN_INVITATION);
        UserAccount user = token.getUser();
        if (user.getStatus() != UserStatus.ACTIVE || !user.getRoles().contains(UserRole.ADMIN)) {
            throw invalidActionToken();
        }
        Instant now = clock.instant();
        if (authActionTokenRepository.consume(token.getTokenHash(), now) != 1) {
            throw invalidActionToken();
        }
        user.updatePasswordHash(passwordEncoder.encode(newPassword), now);
        user.verifyEmail(now);
    }

    @Transactional
    public SessionTokens login(LoginRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw invalidCredentials();
        }
        Optional<UserAccount> match = userRepository.findByEmail(normalizeEmail(request.email()));
        String passwordHash = match.map(UserAccount::getPasswordHash).orElse(fallbackPasswordHash);
        boolean passwordMatches = passwordEncoder.matches(request.password(), passwordHash);
        UserAccount user = match.filter(account -> passwordMatches
                        && account.getStatus() == UserStatus.ACTIVE
                        && account.isEmailVerified())
                .orElseThrow(this::invalidCredentials);
        return createSession(user, clock.instant());
    }

    @Transactional
    public SessionTokens refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw invalidCredentials();
        }
        Instant now = clock.instant();
        String tokenHash = hashToken(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .filter(token -> token.getExpiresAt().isAfter(now))
                .orElseThrow(this::invalidCredentials);
        UserAccount user = stored.getUser();
        if (user.getStatus() != UserStatus.ACTIVE || !user.isEmailVerified()
                || refreshTokenRepository.revokeActive(tokenHash, now) != 1) {
            throw invalidCredentials();
        }
        return createSession(user, now);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenRepository.revokeIfPresent(hashToken(rawRefreshToken), clock.instant());
        }
    }

    @Transactional
    public void requestEmailVerification(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            return;
        }
        userRepository.findByEmail(normalizeEmail(rawEmail))
                .filter(user -> user.getStatus() == UserStatus.ACTIVE && !user.isEmailVerified())
                .ifPresent(user -> issueActionToken(user, AuthActionToken.Purpose.EMAIL_VERIFICATION, clock.instant()));
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        if (rawToken != null && !rawToken.isBlank()
                && authActionTokenRepository.findByTokenHashAndPurpose(
                        hashToken(rawToken), AuthActionToken.Purpose.EMAIL_VERIFICATION)
                        .filter(token -> token.getUser().isEmailVerified())
                        .isPresent()) {
            return;
        }
        AuthActionToken token = findUsableActionToken(rawToken, AuthActionToken.Purpose.EMAIL_VERIFICATION);
        Instant now = clock.instant();
        if (authActionTokenRepository.consume(token.getTokenHash(), now) != 1) {
            throw invalidActionToken();
        }
        token.getUser().verifyEmail(now);
    }

    @Transactional
    public void requestPasswordRecovery(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            return;
        }
        userRepository.findByEmail(normalizeEmail(rawEmail))
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .ifPresent(user -> issueActionToken(user, AuthActionToken.Purpose.PASSWORD_RECOVERY, clock.instant()));
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_LONG", "Password must not exceed 72 UTF-8 bytes");
        }
        AuthActionToken token = findUsableActionToken(rawToken, AuthActionToken.Purpose.PASSWORD_RECOVERY);
        Instant now = clock.instant();
        if (authActionTokenRepository.consume(token.getTokenHash(), now) != 1) {
            throw invalidActionToken();
        }
        token.getUser().updatePasswordHash(passwordEncoder.encode(newPassword), now);
        refreshTokenRepository.revokeAllForUser(token.getUser().getId(), now);
    }

    private void issueActionToken(UserAccount user, AuthActionToken.Purpose purpose, Instant now) {
        String rawToken = saveActionToken(user, purpose, now);
        try {
            if (purpose == AuthActionToken.Purpose.EMAIL_VERIFICATION) {
                mailDelivery.sendVerification(user.getEmail(), rawToken);
            } else {
                mailDelivery.sendPasswordRecovery(user.getEmail(), rawToken);
            }
        } catch (RuntimeException ignored) {
            // Mail failures must not disclose whether a recovery address exists.
        }
    }

    private String saveActionToken(UserAccount user, AuthActionToken.Purpose purpose, Instant now) {
        String rawToken = newActionToken();
        Duration ttl = purpose == AuthActionToken.Purpose.PASSWORD_RECOVERY
                ? passwordRecoveryTokenTtl : emailVerificationTokenTtl;
        authActionTokenRepository.revokeActiveForUser(user.getId(), purpose, now);
        authActionTokenRepository.save(new AuthActionToken(
                user, purpose, hashToken(rawToken), now.plus(ttl), now));
        return rawToken;
    }

    private AuthActionToken findUsableActionToken(String rawToken, AuthActionToken.Purpose purpose) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidActionToken();
        }
        Instant now = clock.instant();
        return authActionTokenRepository.findByTokenHashAndPurpose(hashToken(rawToken), purpose)
                .filter(token -> token.getConsumedAt() == null && token.getExpiresAt().isAfter(now))
                .orElseThrow(this::invalidActionToken);
    }

    private String newActionToken() {
        byte[] randomToken = new byte[32];
        SECURE_RANDOM.nextBytes(randomToken);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomToken);
    }

    private SessionTokens createSession(UserAccount user, Instant now) {
        byte[] randomToken = new byte[48];
        SECURE_RANDOM.nextBytes(randomToken);
        String refreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomToken);
        refreshTokenRepository.save(new RefreshToken(
                user,
                hashToken(refreshToken),
                now.plus(refreshTokenTtl),
                now));
        return new SessionTokens(
                user,
                jwtTokenService.createAccessToken(user),
                refreshToken,
                jwtTokenService.accessTokenTtlSeconds());
    }

    private String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email or session is invalid or expired");
    }

    private ApiException invalidActionToken() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OR_EXPIRED_TOKEN", "The token is invalid or expired");
    }

    private ApiException accountUnavailable() {
        return new ApiException(HttpStatus.CONFLICT, "ACCOUNT_UNAVAILABLE", "Unable to create an account with those details");
    }
}
