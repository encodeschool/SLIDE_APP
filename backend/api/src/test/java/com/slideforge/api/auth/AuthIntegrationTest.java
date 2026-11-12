package com.slideforge.api.auth;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.auth.rate-limit-max-requests=100")
@AutoConfigureMockMvc
@Transactional
class AuthIntegrationTest {
    private static final String REFRESH_COOKIE_NAME = "slideforge_refresh";
    private static final String PASSWORD = "long-enough-test-password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Test
    void refreshWithoutCookieReturnsNoContentForSignedOutClient() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isNoContent());
    }

    @MockBean
    private MailDelivery mailDelivery;

    @Test
    void registrationRequiresEmailVerificationAndStoresOnlySingleUseTokenHash() throws Exception {
        String email = newEmail();
        register(email);

        JsonNode actionToken = loadEmailToken("sendVerification", email);
        assertStoredHash(actionToken.asText());
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject(
                "select count(*) from refresh_tokens token join users u on u.id = token.user_id where u.email = ?",
                Integer.class,
                email));
        login(email, PASSWORD, 401);
        UUID userId = jdbcTemplate.queryForObject("select id from users where email = ?", UUID.class, email);
        String legacyRefreshToken = "unverified-session-" + UUID.randomUUID();
        jdbcTemplate.update(
                "insert into refresh_tokens(id, user_id, token_hash, expires_at, created_at) "
                        + "values (?, ?, ?, now() + interval '1 day', now())",
                UUID.randomUUID(),
                userId,
                hash(legacyRefreshToken));
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(REFRESH_COOKIE_NAME, legacyRefreshToken)))
                .andExpect(status().isUnauthorized());

        verifyEmail(email);
        MvcResult session = login(email, PASSWORD, 200);
        String accessToken = objectMapper.readTree(session.getResponse().getContentAsString())
                .path("accessToken").asText();
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));
        mockMvc.perform(post("/api/v1/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRequest(actionToken.asText()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
    }

    @Test
    void expiredVerificationTokenCannotBeUsed() throws Exception {
        String email = newEmail();
        register(email);
        String rawToken = loadEmailToken("sendVerification", email).asText();
        String hash = hash(rawToken);
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.update(
                "update auth_action_tokens set expires_at = now() - interval '1 second' where token_hash = ?", hash));

        mockMvc.perform(post("/api/v1/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRequest(rawToken))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
        org.junit.jupiter.api.Assertions.assertFalse(jdbcTemplate.queryForObject(
                "select email_verified from users where email = ?", Boolean.class, email));
    }

    @Test
    void recoveryHasEnumerationSafeResponseAndResetsPasswordOnce() throws Exception {
        String email = newEmail();
        register(email);
        verifyEmail(email);
        MvcResult login = login(email, PASSWORD, 200);
        Cookie oldRefreshCookie = login.getResponse().getCookie(REFRESH_COOKIE_NAME);

        String knownResponse = requestRecovery(email);
        String unknownResponse = requestRecovery("absent-" + UUID.randomUUID() + "@example.test");
        org.junit.jupiter.api.Assertions.assertEquals(
                objectMapper.readTree(knownResponse),
                objectMapper.readTree(unknownResponse));

        String resetToken = loadEmailToken("sendPasswordRecovery", email).asText();
        assertStoredHash(resetToken);
        String newPassword = "another-long-password";
        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PasswordResetRequest(resetToken, newPassword))))
                .andExpect(status().isNoContent());
        login(email, PASSWORD, 401);
        MvcResult newSession = login(email, newPassword, 200);
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(oldRefreshCookie))
                .andExpect(status().isUnauthorized());
        org.junit.jupiter.api.Assertions.assertNotNull(newSession.getResponse().getCookie(REFRESH_COOKIE_NAME));

        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PasswordResetRequest(resetToken, PASSWORD))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
    }

    @Test
    void expiredRecoveryTokenCannotResetPassword() throws Exception {
        String email = newEmail();
        register(email);
        requestRecovery(email);
        String rawToken = loadEmailToken("sendPasswordRecovery", email).asText();
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.update(
                "update auth_action_tokens set expires_at = now() - interval '1 second' where token_hash = ?",
                hash(rawToken)));

        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasswordResetRequest(rawToken, "different-long-password"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
        login(email, PASSWORD, 401);
    }

    @Test
    void currentUserRequiresBearerAuthenticationAndVerifiedSession() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
        String email = newEmail();
        register(email);
        login(email, PASSWORD, 401);

        UUID userId = jdbcTemplate.queryForObject("select id from users where email = ?", UUID.class, email);
        Instant now = Instant.now();
        String legacyAccessToken = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder()
                        .issuer("slideforge-api")
                        .subject(userId.toString())
                        .issuedAt(now)
                        .expiresAt(now.plus(5, ChronoUnit.MINUTES))
                        .claim("roles", List.of("USER"))
                        .build())).getTokenValue();
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + legacyAccessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_UNAVAILABLE"));
    }

    @Test
    void currentUserCanUpdateDisplayNameAndLocaleAfterVerification() throws Exception {
        String email = newEmail();
        register(email);
        verifyEmail(email);
        MvcResult session = login(email, PASSWORD, 200);
        JsonNode registeredUser = objectMapper.readTree(session.getResponse().getContentAsString()).path("user");
        String accessToken = objectMapper.readTree(session.getResponse().getContentAsString()).path("accessToken").asText();
        String request = objectMapper.writeValueAsString(
                new com.slideforge.api.users.dto.UpdateUserProfileRequest("  Updated Name  ", "ru"));

        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(registeredUser.path("id").asText()))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.displayName").value("Updated Name"))
                .andExpect(jsonPath("$.locale").value("ru"))
                .andExpect(jsonPath("$.emailVerified").value(true));
    }

    @Test
    void recoveryRequestsForKnownAndUnknownEmailsHaveSameResponse() throws Exception {
        String known = requestRecovery(newEmail());
        String unknown = requestRecovery("missing-" + UUID.randomUUID() + "@example.test");
        org.junit.jupiter.api.Assertions.assertEquals(objectMapper.readTree(known), objectMapper.readTree(unknown));
    }

    private void register(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, PASSWORD, "Phase Two User", "en"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.message").value(AuthActionResponse.GENERIC.message()));
        entityManager.flush();
    }

    private void verifyEmail(String email) throws Exception {
        String token = loadEmailToken("sendVerification", email).asText();
        mockMvc.perform(post("/api/v1/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRequest(token))))
                .andExpect(status().isNoContent());
        entityManager.flush();
    }

    private MvcResult login(String email, String password, int expectedStatus) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().is(expectedStatus))
                .andReturn();
    }

    private String requestRecovery(String email) throws Exception {
        String response = mockMvc.perform(post("/api/v1/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AuthActionRequest(email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(AuthActionResponse.GENERIC.message()))
                .andReturn().getResponse().getContentAsString();
        entityManager.flush();
        return response;
    }

    private JsonNode loadEmailToken(String methodName, String email) throws Exception {
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        if ("sendVerification".equals(methodName)) {
            verify(mailDelivery).sendVerification(eq(email), captor.capture());
        } else {
            verify(mailDelivery).sendPasswordRecovery(eq(email), captor.capture());
        }
        return objectMapper.getNodeFactory().textNode(captor.getValue());
    }

    private void assertStoredHash(String rawToken) throws Exception {
        String hash = hash(rawToken);
        org.junit.jupiter.api.Assertions.assertEquals(64, hash.length());
        org.junit.jupiter.api.Assertions.assertEquals(hash, jdbcTemplate.queryForObject(
                "select token_hash from auth_action_tokens where token_hash = ?", String.class, hash));
        org.junit.jupiter.api.Assertions.assertFalse(jdbcTemplate.queryForObject(
                "select token_hash from auth_action_tokens where token_hash = ?", String.class, hash)
                .equals(rawToken));
    }

    private String hash(String token) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
    }

    private String newEmail() {
        return "phase2-" + UUID.randomUUID() + "@example.test";
    }
}
