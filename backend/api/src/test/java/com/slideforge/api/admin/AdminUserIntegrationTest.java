package com.slideforge.api.admin;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.admin.dto.AdminInvitationRequest;
import com.slideforge.api.admin.service.AdminUserService;
import com.slideforge.api.auth.AdminInvitationCompletionRequest;
import com.slideforge.api.auth.AuthActionRequest;
import com.slideforge.api.auth.AuthActionResponse;
import com.slideforge.api.auth.LoginRequest;
import com.slideforge.api.auth.MailDelivery;
import com.slideforge.api.auth.RegisterRequest;
import com.slideforge.api.auth.TokenRequest;
import com.slideforge.api.common.exception.ApiException;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.auth.rate-limit-max-requests=100")
@AutoConfigureMockMvc
@Transactional
class AdminUserIntegrationTest {
    private static final String PASSWORD = "long-enough-test-password";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;
    @Autowired private AdminUserService adminUserService;
    @MockBean private MailDelivery mailDelivery;

    @BeforeEach
    void isolateAdminRoleTestsFromBootstrapAccounts() {
        jdbcTemplate.update(
                "UPDATE users SET status = 'BLOCKED' WHERE id IN "
                        + "(SELECT user_id FROM user_roles WHERE role = 'ADMIN')");
    }

    @Test
    void requiresAuthenticationAndAdminRoleForAllOperations() throws Exception {
        String adminToken = createAccount("admin", true).token();
        String userToken = createAccount("user", false).token();

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/users/{id}/disable", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(userToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/users/{id}/enable", UUID.randomUUID())
                        .header("Authorization", bearer(userToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());
        mockMvc.perform(get("/api/v1/admin/users").param("size", "101")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCanSearchDisableAndEnableWithoutExposingCredentialsOrSessions() throws Exception {
        Session admin = createAccount("ops", true);
        Session member = createAccount("member", false);

        mockMvc.perform(get("/api/v1/admin/users")
                        .param("search", "MEMBER")
                        .param("status", "ACTIVE")
                        .param("page", "0")
                        .param("size", "5")
                        .header("Authorization", bearer(admin.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].email").value(member.email()))
                .andExpect(jsonPath("$.items[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.items[0].refreshToken").doesNotExist())
                .andExpect(jsonPath("$.items[0].accessToken").doesNotExist());

        mockMvc.perform(post("/api/v1/admin/users/{id}/disable", member.id())
                        .header("Authorization", bearer(admin.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BLOCKED"));
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", bearer(member.token())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_UNAVAILABLE"));
        mockMvc.perform(get("/api/v1/admin/users").param("status", "BLOCKED")
                        .header("Authorization", bearer(admin.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(member.id().toString()));

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(member.refreshCookie()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/users/{id}/enable", member.id())
                        .header("Authorization", bearer(admin.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", bearer(member.token())))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanInviteAnotherAdminToSetTheirOwnPassword() throws Exception {
        Session admin = createAccount("inviter", true);
        Session member = createAccount("not-inviter", false);
        String invitedEmail = "new-admin-" + UUID.randomUUID() + "@example.test";
        String newPassword = "another-secure-test-password";
        String invitationRequest = objectMapper.writeValueAsString(
                new AdminInvitationRequest(invitedEmail, "New Administrator", "en"));

        mockMvc.perform(post("/api/v1/admin/users/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invitationRequest))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/users/invitations")
                        .header("Authorization", bearer(member.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invitationRequest))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/users/invitations")
                        .header("Authorization", bearer(admin.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invitationRequest))
                .andExpect(status().isAccepted());

        ArgumentCaptor<String> invitationToken = ArgumentCaptor.forClass(String.class);
        verify(mailDelivery).sendAdminInvitation(eq(invitedEmail), invitationToken.capture());
        mockMvc.perform(post("/api/v1/auth/admin-invitation/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AuthActionRequest(invitedEmail))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(AuthActionResponse.GENERIC.message()));
        verify(mailDelivery, org.mockito.Mockito.times(2)).sendAdminInvitation(eq(invitedEmail), invitationToken.capture());
        UUID invitedId = jdbcTemplate.queryForObject(
                "select id from users where email = ?", UUID.class, invitedEmail);
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from user_roles where user_id = ? and role = 'ADMIN'", Integer.class, invitedId));

        String oldToken = invitationToken.getAllValues().get(0);
        String latestToken = invitationToken.getAllValues().get(invitationToken.getAllValues().size() - 1);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(invitedEmail, PASSWORD))))
                .andExpect(status().isUnauthorized());
        String completion = objectMapper.writeValueAsString(
                new AdminInvitationCompletionRequest(latestToken, newPassword));
        mockMvc.perform(post("/api/v1/auth/admin-invitation/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AdminInvitationCompletionRequest(oldToken, newPassword))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
        mockMvc.perform(post("/api/v1/auth/admin-invitation/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(completion))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/auth/admin-invitation/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(completion))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(invitedEmail, newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.roles[0]").value("ADMIN"));

        mockMvc.perform(post("/api/v1/auth/admin-invitation/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AuthActionRequest(
                                "unknown-" + UUID.randomUUID() + "@example.test"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(AuthActionResponse.GENERIC.message()));
    }

    @Test
    void preventsSelfDisableLastActiveAdminAndPublicRoleEscalation() throws Exception {
        Session admin = createAccount("sole-admin", true);
        Session member = createAccount("ordinary", false);

        mockMvc.perform(post("/api/v1/admin/users/{id}/disable", admin.id())
                        .header("Authorization", bearer(admin.token())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SELF_DISABLE_NOT_ALLOWED"));

        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", bearer(member.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Not admin\",\"locale\":\"en\",\"roles\":[\"ADMIN\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("USER"));
        org.junit.jupiter.api.Assertions.assertEquals("LAST_ACTIVE_ADMIN",
                org.junit.jupiter.api.Assertions.assertThrows(ApiException.class,
                        () -> adminUserService.disable(member.id(), admin.id())).getCode());
        mockMvc.perform(post("/api/v1/admin/users/{id}/disable", member.id())
                        .header("Authorization", bearer(admin.token())))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin.token())))
                .andExpect(status().isOk());
    }

    private Session createAccount(String label, boolean admin) throws Exception {
        String email = label + "-" + UUID.randomUUID() + "@example.test";
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(email, PASSWORD, label, "en"))))
                .andExpect(status().isCreated());

        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailDelivery).sendVerification(eq(email), tokenCaptor.capture());
        mockMvc.perform(post("/api/v1/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRequest(tokenCaptor.getValue()))))
                .andExpect(status().isNoContent());
        UUID userId = jdbcTemplate.queryForObject("select id from users where email = ?", UUID.class, email);
        if (admin) {
            jdbcTemplate.update("insert into user_roles(user_id, role) values (?, 'ADMIN')", userId);
            entityManager.flush();
            entityManager.clear();
        }

        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode response = objectMapper.readTree(login.getResponse().getContentAsString());
        return new Session(
                userId,
                email,
                response.path("accessToken").asText(),
                login.getResponse().getCookie("slideforge_refresh"));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private record Session(UUID id, String email, String token, Cookie refreshCookie) {
    }
}
