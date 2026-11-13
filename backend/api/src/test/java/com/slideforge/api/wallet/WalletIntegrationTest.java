package com.slideforge.api.wallet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.profiles.active=sandbox",
        "app.payments.sandbox.enabled=true",
        "app.generations.worker-enabled=false",
        "app.auth.rate-limit-max-requests=100"
})
@AutoConfigureMockMvc
class WalletIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JdbcTemplate jdbcTemplate;
    @MockBean private MailDelivery mailDelivery;

    @Test
    void packagesAreIdempotentAndEmptyWalletCannotStartWork() throws Exception {
        String token = AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                mapper,
                mailDelivery,
                new RegisterRequest(
                        "wallet-" + UUID.randomUUID() + "@example.test",
                        "long-enough-test-password", "Wallet User", "en"));

        mockMvc.perform(get("/api/v1/wallet").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceTiyin").value(0))
                .andExpect(jsonPath("$.workCredits").value(0))
                .andExpect(jsonPath("$.sandboxEnabled").value(true))
                .andExpect(jsonPath("$.packages[0].amountTiyin").value(3_600_000))
                .andExpect(jsonPath("$.packages[0].workUnits").value(18))
                .andExpect(jsonPath("$.packages[1].amountTiyin").value(7_000_000))
                .andExpect(jsonPath("$.packages[1].workUnits").value(70));

        mockMvc.perform(post("/api/v1/generations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"prompt":"A short presentation","language":"en","slideCount":3}
                                """))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_BALANCE"));

        String idempotencyKey = "wallet-test-" + UUID.randomUUID();
        String starterTopUp = """
                {"packageCode":"STARTER","idempotencyKey":"%s","paymentMethod":"PAYME"}
                """.formatted(idempotencyKey);
        mockMvc.perform(post("/api/v1/wallet/topups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(starterTopUp))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceTiyin").value(3_600_000))
                .andExpect(jsonPath("$.workCredits").value(18));
        mockMvc.perform(get("/api/v1/wallet/transactions").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("TOP_UP"))
                .andExpect(jsonPath("$[0].status").value("SETTLED"))
                .andExpect(jsonPath("$[0].amountTiyin").value(3_600_000))
                .andExpect(jsonPath("$[0].paymentMethod").value("PAYME"))
                .andExpect(jsonPath("$[0].sandbox").value(true));
        org.junit.jupiter.api.Assertions.assertEquals(
                "PAYME",
                jdbcTemplate.queryForObject(
                        "SELECT payment_method FROM wallet_transactions WHERE idempotency_key = ?",
                        String.class,
                        idempotencyKey));

        mockMvc.perform(post("/api/v1/wallet/topups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(starterTopUp))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceTiyin").value(3_600_000))
                .andExpect(jsonPath("$.workCredits").value(18));

        mockMvc.perform(post("/api/v1/wallet/topups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(starterTopUp.replace("PAYME", "CLICK")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));

        mockMvc.perform(post("/api/v1/wallet/topups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"packageCode":"VALUE","idempotencyKey":"wallet-value-%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceTiyin").value(10_600_000))
                .andExpect(jsonPath("$.workCredits").value(88));

        mockMvc.perform(post("/api/v1/wallet/topups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(starterTopUp.replace("STARTER", "VALUE")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));

        String otherToken = AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                mapper,
                mailDelivery,
                new RegisterRequest(
                        "wallet-other-" + UUID.randomUUID() + "@example.test",
                        "long-enough-test-password", "Other Wallet User", "en"));
        mockMvc.perform(get("/api/v1/wallet/transactions").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
