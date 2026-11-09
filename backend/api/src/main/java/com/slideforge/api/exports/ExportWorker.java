package com.slideforge.api.exports;

import com.fasterxml.jackson.databind.JsonNode;
import com.slideforge.api.presentations.PresentationVersionRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.exports", name = "worker-enabled", havingValue = "true", matchIfMissing = true)
public class ExportWorker {
    private static final Logger LOGGER = LoggerFactory.getLogger(ExportWorker.class);

    private final ExportJobService jobService;
    private final PresentationVersionRepository versionRepository;
    private final RendererClient rendererClient;

    public ExportWorker(
            ExportJobService jobService,
            PresentationVersionRepository versionRepository,
            RendererClient rendererClient) {
        this.jobService = jobService;
        this.versionRepository = versionRepository;
        this.rendererClient = rendererClient;
    }

    @Scheduled(fixedDelayString = "${app.exports.poll-interval-ms:1000}")
    public void processNext() {
        jobService.claimNext().ifPresent(this::render);
    }

    private void render(ExportJob job) {
        Path output = jobService.artifactPath(job);
        try {
            JsonNode document = versionRepository.findByPresentationIdAndVersion(job.getPresentationId(), job.getVersion())
                    .orElseThrow(() -> new IllegalStateException("Presentation version is missing"))
                    .getDocument();
            byte[] contents = rendererClient.render(document, job.getFormat());
            Files.createDirectories(output.getParent());
            Files.write(output, contents);
            jobService.complete(job.getId(), output);
        } catch (Exception exception) {
            try {
                Files.deleteIfExists(output);
            } catch (Exception cleanupException) {
                LOGGER.warn("Could not remove incomplete export artifact for job {}", job.getId());
            }
            LOGGER.warn("Export job {} failed", job.getId());
            jobService.fail(job.getId());
        }
    }
}