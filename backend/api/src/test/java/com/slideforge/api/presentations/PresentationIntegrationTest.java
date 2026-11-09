package com.slideforge.api.presentations;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.slideforge.api.auth.LoginRequest;
import com.slideforge.api.auth.RegisterRequest;
import com.slideforge.api.auth.AuthTestSupport;
import com.slideforge.api.auth.MailDelivery;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.auth.rate-limit-max-requests=100")
@AutoConfigureMockMvc
@Transactional
class PresentationIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MailDelivery mailDelivery;

    @Test
    void savesVersionedDocumentsAndRejectsStaleVersion() throws Exception {
        String accessToken = registerAndGetAccessToken();
        String title = "Quarterly planning";
        MvcResult created = createPresentation(accessToken, title);
        JsonNode createdBody = objectMapper.readTree(created.getResponse().getContentAsString());
        UUID presentationId = UUID.fromString(createdBody.path("id").asText());
        JsonNode firstDocument = createdBody.path("document");

        ObjectNode changedDocument = ((ObjectNode) firstDocument).deepCopy();
        changedDocument.put("title", "Quarterly planning revised");
        ((ObjectNode) changedDocument.withArray("slides").get(0)
                .withArray("elements").get(0)).put("text", "Updated text");
        mockMvc.perform(put("/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SavePresentationRequest(1, changedDocument))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion").value(2))
                .andExpect(jsonPath("$.title").value("Quarterly planning revised"));

        mockMvc.perform(get("/api/v1/presentations/{id}/versions/1", presentationId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.document.title").value(title));
        mockMvc.perform(put("/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SavePresentationRequest(1, changedDocument))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
    }

    @Test
    void presentationIdsDoNotBypassOwnerChecks() throws Exception {
        String ownerToken = registerAndGetAccessToken();
        String otherToken = registerAndGetAccessToken();
        UUID presentationId = UUID.fromString(objectMapper.readTree(
                createPresentation(ownerToken, "Private deck").getResponse().getContentAsString())
                .path("id").asText());

        mockMvc.perform(get("/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRESENTATION_NOT_FOUND"));
        mockMvc.perform(delete("/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void rejectsOutOfBoundsSlideElements() throws Exception {
        String accessToken = registerAndGetAccessToken();
        ObjectNode deck = document("Invalid geometry");
        ((ObjectNode) deck.withArray("slides").get(0)
                .withArray("elements").get(0)).put("x", 1800);

        mockMvc.perform(post("/api/v1/presentations")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreatePresentationRequest(
                                "Invalid geometry", "en", deck))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PRESENTATION"));
    }

    @Test
    void listAndSoftDeleteAreOwnerScoped() throws Exception {
        String accessToken = registerAndGetAccessToken();
        UUID presentationId = UUID.fromString(objectMapper.readTree(
                createPresentation(accessToken, "Archive me").getResponse().getContentAsString())
                .path("id").asText());

        mockMvc.perform(get("/api/v1/presentations")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1));
        mockMvc.perform(delete("/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    private String registerAndGetAccessToken() throws Exception {
        String email = "deck-" + UUID.randomUUID() + "@example.test";
        return AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                objectMapper,
                mailDelivery,
                new RegisterRequest(email, "long-enough-test-password", "Deck Owner", "en"));
    }

    private MvcResult createPresentation(String accessToken, String title) throws Exception {
        return mockMvc.perform(post("/api/v1/presentations")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreatePresentationRequest(title, "en", document(title)))))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private ObjectNode document(String title) {
        ObjectNode document = objectMapper.createObjectNode();
        document.put("schemaVersion", 1);
        document.put("id", UUID.randomUUID().toString());
        document.put("title", title);
        document.put("language", "en");
        ObjectNode size = document.putObject("size");
        size.put("width", 1280);
        size.put("height", 720);
        ArrayNode slides = document.putArray("slides");
        ObjectNode slide = slides.addObject();
        slide.put("id", UUID.randomUUID().toString());
        ArrayNode elements = slide.putArray("elements");
        ObjectNode text = elements.addObject();
        text.put("id", UUID.randomUUID().toString());
        text.put("type", "text");
        text.put("x", 40);
        text.put("y", 40);
        text.put("w", 400);
        text.put("h", 100);
        text.put("text", "First slide");
        return document;
    }
}