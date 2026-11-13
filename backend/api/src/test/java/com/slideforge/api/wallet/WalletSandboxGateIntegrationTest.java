package com.slideforge.api.wallet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.auth.AuthTestSupport;
import com.slideforge.api.auth.MailDelivery;
import com.slideforge.api.auth.RegisterRequest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "app.payments.sandbox.enabled=false",
        "app.generations.worker-enabled=false",
        "app.auth.rate-limit-max-requests=100"
})
@AutoConfigureMockMvc
class WalletSandboxGateIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @MockBean private MailDelivery mailDelivery;

    @Test
    void topUpsAreDisabledWithoutExplicitSandboxConfiguration() throws Exception {
        String token = AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                mapper,
                mailDelivery,
                new RegisterRequest(
                        "wallet-gate-" + UUID.randomUUID() + "@example.test",
                        "long-enough-test-password", "Wallet User", "en"));

        mockMvc.perform(post("/api/v1/wallet/topups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"packageCode":"STARTER","idempotencyKey":"wallet-gate-%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SANDBOX_DISABLED"));
    }
}
