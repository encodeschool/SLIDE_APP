package com.slideforge.api.exports;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.presentations.PresentationVersion;
import com.slideforge.api.presentations.PresentationVersionRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExportWorkerTest {
    @Mock
    private ExportJobService jobService;

    @Mock
    private PresentationVersionRepository versionRepository;

    @Mock
    private RendererClient rendererClient;

    @TempDir
    private Path tempDirectory;

    @Test
    void rendersPinnedVersionToPersistentArtifact() throws Exception {
        UUID presentationId = UUID.randomUUID();
        ExportJob job = new ExportJob(UUID.randomUUID(), UUID.randomUUID(), presentationId, 3, ExportFormat.PPTX, Instant.now());
        Path artifact = tempDirectory.resolve("export.pptx");
        PresentationVersion version = version(presentationId, 3);
        when(jobService.claimNext()).thenReturn(Optional.of(job));
        when(jobService.artifactPath(job)).thenReturn(artifact);
        when(versionRepository.findByPresentationIdAndVersion(presentationId, 3)).thenReturn(Optional.of(version));
        when(rendererClient.render(version.getDocument(), ExportFormat.PPTX)).thenReturn(new byte[] { 1, 2, 3 });

        new ExportWorker(jobService, versionRepository, rendererClient).processNext();

        org.junit.jupiter.api.Assertions.assertArrayEquals(new byte[] { 1, 2, 3 }, Files.readAllBytes(artifact));
        verify(jobService).complete(job.getId(), artifact);
    }

    @Test
    void marksFailedRenderWithoutExposingRendererErrors() throws Exception {
        UUID presentationId = UUID.randomUUID();
        ExportJob job = new ExportJob(UUID.randomUUID(), UUID.randomUUID(), presentationId, 1, ExportFormat.PDF, Instant.now());
        Path artifact = tempDirectory.resolve("failed.pdf");
        PresentationVersion version = version(presentationId, 1);
        when(jobService.claimNext()).thenReturn(Optional.of(job));
        when(jobService.artifactPath(job)).thenReturn(artifact);
        when(versionRepository.findByPresentationIdAndVersion(presentationId, 1)).thenReturn(Optional.of(version));
        when(rendererClient.render(version.getDocument(), ExportFormat.PDF)).thenThrow(new IllegalStateException("private renderer detail"));

        new ExportWorker(jobService, versionRepository, rendererClient).processNext();

        org.junit.jupiter.api.Assertions.assertFalse(Files.exists(artifact));
        verify(jobService).fail(job.getId());
    }

    private PresentationVersion version(UUID presentationId, int version) throws Exception {
        return new PresentationVersion(
                presentationId,
                version,
                new ObjectMapper().readTree("{\"schemaVersion\":1,\"slides\":[]}"),
                Instant.now());
    }
}