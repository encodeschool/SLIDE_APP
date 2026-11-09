package com.slideforge.api.exports;

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
import com.slideforge.api.presentations.CreatePresentationRequest;
import com.slideforge.api.presentations.SavePresentationRequest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "app.exports.worker-enabled=false",
        "app.auth.rate-limit-max-requests=100"
})
@AutoConfigureMockMvc
@Transactional
class ExportIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MailDelivery mailDelivery;

        @Autowired
        private ExportJobRepository exportJobRepository;

        @Autowired
        private ExportJobService exportJobService;

    @Test
    void exportJobsAreQueuedAndOwnerScoped() throws Exception {
        String ownerToken = registerAndGetAccessToken();
        String otherToken = registerAndGetAccessToken();
        UUID presentationId = createPresentation(ownerToken);

        MvcResult queued = mockMvc.perform(post("/api/v1/presentations/{id}/exports", presentationId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"pptx\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.format").value("pptx"))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.downloadUrl").doesNotExist())
                .andReturn();
        UUID jobId = UUID.fromString(objectMapper.readTree(queued.getResponse().getContentAsString()).path("id").asText());

        mockMvc.perform(get("/api/v1/exports/{id}", jobId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUEUED"));
        mockMvc.perform(get("/api/v1/exports/{id}", jobId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EXPORT_NOT_FOUND"));
        mockMvc.perform(get("/api/v1/exports/{id}/file", jobId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EXPORT_NOT_READY"));

        ExportJob job = exportJobRepository.findById(jobId).orElseThrow();
        Path artifact = exportJobService.artifactPath(job);
        Files.createDirectories(artifact.getParent());
        Files.write(artifact, new byte[] { 1, 2, 3 });
        job.succeed(artifact.toString(), Instant.now());
        exportJobRepository.saveAndFlush(job);
        try {
            mockMvc.perform(get("/api/v1/exports/{id}/file", jobId)
                            .header("Authorization", "Bearer " + ownerToken))
                    .andExpect(status().isOk())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                            .contentType("application/vnd.openxmlformats-officedocument.presentationml.presentation"))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                            .bytes(new byte[] { 1, 2, 3 }));
            mockMvc.perform(get("/api/v1/exports/{id}/file", jobId)
                            .header("Authorization", "Bearer " + otherToken))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("EXPORT_NOT_FOUND"));
        } finally {
            Files.deleteIfExists(artifact);
        }
    }

    @Test
    void exportRequestValidatesFormatAndPresentationOwnership() throws Exception {
        String ownerToken = registerAndGetAccessToken();
        String otherToken = registerAndGetAccessToken();
        UUID presentationId = createPresentation(ownerToken);

        mockMvc.perform(post("/api/v1/presentations/{id}/exports", presentationId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"docx\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/presentations/{id}/exports", presentationId)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"pdf\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRESENTATION_NOT_FOUND"));
    }

    @Test
    void historicalExportPinsRequestedVersion() throws Exception {
        String accessToken = registerAndGetAccessToken();
        UUID presentationId = createPresentation(accessToken);
        JsonNode current = objectMapper.readTree(mockMvc.perform(get("/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        ObjectNode changedDocument = ((ObjectNode) current.path("document")).deepCopy();
        changedDocument.put("title", "Version two");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                                "/api/v1/presentations/{id}", presentationId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SavePresentationRequest(1, changedDocument))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion").value(2));

        mockMvc.perform(post("/api/v1/presentations/{id}/exports", presentationId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"pdf\",\"version\":1}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.version").value(1));
    }

    private String registerAndGetAccessToken() throws Exception {
        String email = "export-" + UUID.randomUUID() + "@example.test";
        return AuthTestSupport.registerVerifyAndLogin(
                mockMvc,
                objectMapper,
                mailDelivery,
                new RegisterRequest(email, "long-enough-test-password", "Export Owner", "en"));
    }

    private UUID createPresentation(String accessToken) throws Exception {
        ObjectNode document = objectMapper.createObjectNode();
        document.put("schemaVersion", 1);
        document.put("id", UUID.randomUUID().toString());
        document.put("title", "Export test deck");
        document.put("language", "en");
        document.putObject("size").put("width", 1280).put("height", 720);
        ArrayNode slides = document.putArray("slides");
        slides.addObject().put("id", UUID.randomUUID().toString()).putArray("elements");

        MvcResult created = mockMvc.perform(post("/api/v1/presentations")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreatePresentationRequest(
                                "Export test deck", "en", document))))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(created.getResponse().getContentAsString()).path("id").asText());
    }
}