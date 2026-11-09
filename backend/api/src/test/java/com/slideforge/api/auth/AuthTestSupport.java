package com.slideforge.api.auth;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

public final class AuthTestSupport {
    private AuthTestSupport() {
    }

    public static String registerVerifyAndLogin(
            MockMvc mockMvc, ObjectMapper objectMapper, MailDelivery mailDelivery, RegisterRequest request)
            throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(mailDelivery).sendVerification(eq(request.email()), token.capture());
        mockMvc.perform(post("/api/v1/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRequest(token.getValue()))))
                .andExpect(status().isNoContent());
        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(request.email(), request.password()))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode session = objectMapper.readTree(response);
        return session.path("accessToken").asText();
    }
}
