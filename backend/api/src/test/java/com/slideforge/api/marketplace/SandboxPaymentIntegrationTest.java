package com.slideforge.api.marketplace;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "spring.profiles.active=sandbox",
    "app.payments.sandbox.enabled=true",
    "app.auth.rate-limit-max-requests=100"
})
@AutoConfigureMockMvc
@Transactional
class SandboxPaymentIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private MailDelivery mailDelivery;

    @Test
    void explicitSandboxProfileConfirmsOrderAndGrantsEntitlementExactlyOnce() throws Exception {
        String sellerToken = register("sandbox-seller");
        String buyerToken = register("sandbox-buyer");
        UUID deckId = createPresentation(sellerToken);
        UUID listingId = createListing(sellerToken, deckId);
        mockMvc.perform(post("/api/v1/seller/listings/{id}/publish", listingId)
                        .header("Authorization", bearer(sellerToken)))
                .andExpect(status().isOk());

        MvcResult createdOrder = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", bearer(buyerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateOrderRequest(listingId, "sandbox-" + UUID.randomUUID()))))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode order = objectMapper.readTree(createdOrder.getResponse().getContentAsString());
        UUID orderId = UUID.fromString(order.path("id").asText());

        mockMvc.perform(post("/api/v1/orders/{id}/sandbox-confirm", orderId)
                        .header("Authorization", bearer(buyerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));
        mockMvc.perform(post("/api/v1/orders/{id}/sandbox-confirm", orderId)
                        .header("Authorization", bearer(buyerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));
        mockMvc.perform(post("/api/v1/orders/{id}/sandbox-confirm", orderId)
                        .header("Authorization", bearer(sellerToken)))
                .andExpect(status().isNotFound());

        Integer entitlementCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM entitlements WHERE order_id = ?", Integer.class, orderId);
        Integer eventCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM payment_events WHERE order_id = ? AND provider = 'SANDBOX'",
                Integer.class,
                orderId);
        org.junit.jupiter.api.Assertions.assertEquals(1, entitlementCount);
        org.junit.jupiter.api.Assertions.assertEquals(1, eventCount);
    }

    private String register(String prefix) throws Exception {
        String email = prefix + "-" + UUID.randomUUID() + "@example.test";
        return AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                objectMapper,
                mailDelivery,
                new RegisterRequest(email, "long-enough-test-password", prefix, "en"));
    }

    private UUID createPresentation(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/presentations")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new com.slideforge.api.presentations.CreatePresentationRequest(
                                "Sandbox deck", "en", document()))))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private UUID createListing(String token, UUID presentationId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/seller/listings")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateListingRequest(presentationId, 1, 2000L, "Sandbox listing", "Personal use"))))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private ObjectNode document() {
        ObjectNode document = objectMapper.createObjectNode();
        document.put("schemaVersion", 1);
        document.put("id", UUID.randomUUID().toString());
        document.put("title", "Sandbox deck");
        document.put("language", "en");
        ObjectNode size = document.putObject("size");
        size.put("width", 1280);
        size.put("height", 720);
        ArrayNode slides = document.putArray("slides");
        ObjectNode slide = slides.addObject();
        slide.put("id", UUID.randomUUID().toString());
        slide.putArray("elements");
        return document;
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
