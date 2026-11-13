package com.slideforge.api.artifacts;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.auth.AuthTestSupport;
import com.slideforge.api.auth.MailDelivery;
import com.slideforge.api.auth.RegisterRequest;
import com.slideforge.api.exports.RendererClient;
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
        "spring.profiles.active=sandbox",
        "app.payments.sandbox.enabled=true",
        "app.generations.worker-enabled=false",
        "app.auth.rate-limit-max-requests=100"
})
@AutoConfigureMockMvc
class ArtifactIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @MockBean private MailDelivery mailDelivery;
    @MockBean private ArtifactGenerationProvider generationProvider;
    @MockBean private RendererClient renderer;

    @Test
    void draftsSavesVersionsScopesAndExportsAnArtifact() throws Exception {
        String owner = loginToken();
        String otherOwner = loginToken();
        JsonNode quiz = mapper.readTree("""
                {"schemaVersion":1,"id":"draft","type":"quiz","title":"Water quiz","language":"en",
                 "sections":[{"id":"s1","heading":"Instructions","body":"Choose an answer."}],
                 "questions":[{"id":"q1","question":"What is H2O?","options":["Water","Oxygen"],
                   "answerIndex":0,"explanation":"Water contains hydrogen and oxygen."}]}
                """);
        when(generationProvider.generate(eq("quiz"), eq("Create a water quiz"), eq("en"), eq(1)))
                .thenReturn(quiz);
        mockMvc.perform(post("/api/v1/artifacts/draft")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"quiz","prompt":"Create a water quiz","language":"en","itemCount":1}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.document.type").value("quiz"))
                .andExpect(jsonPath("$.document.questions[0].answerIndex").value(0));

        MvcResult created = mockMvc.perform(post("/api/v1/artifacts")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(mapper.createObjectNode()
                                .put("type", "quiz").put("title", "Water quiz").put("language", "en")
                                .set("document", quiz))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.currentVersion").value(1))
                .andReturn();
        UUID id = UUID.fromString(mapper.readTree(created.getResponse().getContentAsString()).path("id").asText());

        JsonNode versionTwo = mapper.readTree(quiz.toString().replace("Water quiz", "Water and air quiz"));
        mockMvc.perform(put("/api/v1/artifacts/{id}", id)
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(mapper.createObjectNode()
                                .put("expectedVersion", 1).set("document", versionTwo))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion").value(2));
        mockMvc.perform(put("/api/v1/artifacts/{id}", id)
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(mapper.createObjectNode()
                                .put("expectedVersion", 1).set("document", versionTwo))))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/v1/artifacts/{id}?version=1", id)
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion").value(2))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.document.title").value("Water quiz"));
        mockMvc.perform(get("/api/v1/artifacts/{id}", id).header("Authorization", "Bearer " + otherOwner))
                .andExpect(status().isNotFound());

        byte[] docx = new byte[] {1, 2, 3};
        when(renderer.renderArtifact(any(JsonNode.class), eq("docx"))).thenReturn(docx);
        mockMvc.perform(get("/api/v1/artifacts/{id}/exports/docx?version=1", id)
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .andExpect(content().bytes(docx));
    }

    @Test
    void draftRejectsOutputThatDoesNotMatchRequestedSize() throws Exception {
        String owner = loginToken();
        JsonNode quiz = mapper.readTree("""
                {"schemaVersion":1,"id":"draft","type":"quiz","title":"Water quiz","language":"en",
                 "sections":[{"id":"s1","heading":"Instructions","body":"Choose an answer."}],
                 "questions":[{"id":"q1","question":"What is H2O?","options":["Water","Oxygen"],
                   "answerIndex":0,"explanation":"Water contains hydrogen and oxygen."}]}
                """);
        when(generationProvider.generate(eq("quiz"), eq("Create a water quiz"), eq("en"), eq(2)))
                .thenReturn(quiz);

        mockMvc.perform(post("/api/v1/artifacts/draft")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"quiz","prompt":"Create a water quiz","language":"en","itemCount":2}
                                """))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("GENERATED_ARTIFACT_INVALID"));
        mockMvc.perform(get("/api/v1/wallet").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceTiyin").value(3_600_000))
                .andExpect(jsonPath("$.workCredits").value(18));
    }

    private String loginToken() throws Exception {
        String token = AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                mapper,
                mailDelivery,
                new RegisterRequest(
                        "artifact-" + UUID.randomUUID() + "@example.com",
                        "strong-password-123",
                        "Artifact User",
                        "en"));
        mockMvc.perform(post("/api/v1/wallet/topups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"packageCode":"STARTER","idempotencyKey":"artifact-test-%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isOk());
        return token;
    }
}
