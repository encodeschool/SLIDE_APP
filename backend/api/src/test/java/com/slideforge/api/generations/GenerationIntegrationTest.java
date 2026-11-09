package com.slideforge.api.generations;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.slideforge.api.auth.RegisterRequest;
import com.slideforge.api.auth.AuthTestSupport;
import com.slideforge.api.auth.MailDelivery;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "app.generations.poll-interval-ms=50",
        "app.auth.rate-limit-max-requests=100"
})
@AutoConfigureMockMvc
class GenerationIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GenerationProvider provider;

    @MockBean
    private MailDelivery mailDelivery;

    @Test
    void persistsValidatedResultAndScopesStatusToOwner() throws Exception {
        String ownerToken = registerAndGetAccessToken();
        String otherToken = registerAndGetAccessToken();
        ObjectNode expectedDeck = deck("Investor update", "en", 3);
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate(eq("Investor update for a small business"), eq("en"), anyInt())).thenReturn(expectedDeck);

        MvcResult submitted = submit(ownerToken, "Investor update for a small business", "en", 3);
        JsonNode queued = objectMapper.readTree(submitted.getResponse().getContentAsString());
        UUID jobId = UUID.fromString(queued.path("id").asText());
        mockMvc.perform(get("/api/v1/generations/{id}", jobId).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GENERATION_NOT_FOUND"));

        MvcResult completed = awaitResult(jobId, ownerToken);
        org.junit.jupiter.api.Assertions.assertEquals(200, completed.getResponse().getStatus());
        mockMvc.perform(get("/api/v1/generations/{id}", jobId).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCEEDED"))
                .andExpect(jsonPath("$.document.id").value(jobId.toString()))
                .andExpect(jsonPath("$.document.slides.length()").value(3));
        verify(provider).generate("Investor update for a small business", "en", 3);
    }

    @Test
    void persistsFailureWhenProviderIsNotConfigured() throws Exception {
        String token = registerAndGetAccessToken();
        when(provider.isConfigured()).thenReturn(false);
        UUID jobId = UUID.fromString(objectMapper.readTree(
                submit(token, "A short deck", "en", 2).getResponse().getContentAsString()).path("id").asText());
        awaitResult(jobId, token);

        mockMvc.perform(get("/api/v1/generations/{id}", jobId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.failureCode").value("AI_PROVIDER_UNCONFIGURED"))
                .andExpect(jsonPath("$.document").doesNotExist());
    }

    @Test
    void rejectsInvalidProviderDeckAndEnforcesRequestBounds() throws Exception {
        String token = registerAndGetAccessToken();
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate(eq("Brief"), eq("en"), eq(2))).thenReturn(deck("Wrong count", "en", 1));
        UUID jobId = UUID.fromString(objectMapper.readTree(
                submit(token, "Brief", "en", 2).getResponse().getContentAsString()).path("id").asText());
        awaitResult(jobId, token);

        mockMvc.perform(get("/api/v1/generations/{id}", jobId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.failureCode").value("GENERATED_DECK_INVALID"));
        mockMvc.perform(post("/api/v1/generations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prompt\":\"Brief\",\"language\":\"en\",\"slideCount\":21}"))
                .andExpect(status().isBadRequest());
    }

    private MvcResult submit(String token, String prompt, String language, int slides) throws Exception {
        return mockMvc.perform(post("/api/v1/generations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateGenerationRequest(prompt, language, slides))))
                .andExpect(status().isAccepted())
                .andReturn();
    }

    private MvcResult awaitResult(UUID jobId, String token) throws Exception {
        MvcResult result = null;
        for (int attempt = 0; attempt < 100; attempt++) {
            result = mockMvc.perform(get("/api/v1/generations/{id}", jobId)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andReturn();
            String state = objectMapper.readTree(result.getResponse().getContentAsString()).path("status").asText();
            if (state.equals("SUCCEEDED") || state.equals("FAILED")) return result;
            Thread.sleep(50);
        }
        throw new AssertionError("Generation job did not reach a terminal state");
    }

    private String registerAndGetAccessToken() throws Exception {
        return AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                objectMapper,
                mailDelivery,
                new RegisterRequest(
                        "generation-" + UUID.randomUUID() + "@example.test",
                        "long-enough-test-password", "Generation User", "en"));
    }

    private ObjectNode deck(String title, String language, int slideCount) {
        ObjectNode document = objectMapper.createObjectNode();
        document.put("schemaVersion", 1);
        document.put("id", UUID.randomUUID().toString());
        document.put("title", title);
        document.put("language", language);
        document.putObject("size").put("width", 1280).put("height", 720);
        ArrayNode slides = document.putArray("slides");
        for (int index = 0; index < slideCount; index++) {
            slides.addObject().put("id", UUID.randomUUID().toString()).putArray("elements");
        }
        return document;
    }
}
