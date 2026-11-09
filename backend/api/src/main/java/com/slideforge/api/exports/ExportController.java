package com.slideforge.api.exports;

import java.net.URI;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

@RestController
@Validated
@RequestMapping("/api/v1")
public class ExportController {
    private final ExportJobService jobService;

    public ExportController(ExportJobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping("/presentations/{presentationId}/exports")
    public ResponseEntity<ExportJobResponse> enqueue(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID presentationId,
            @Valid @RequestBody CreateExportRequest request) {
        ExportJobResponse job = jobService.enqueue(userId(jwt), presentationId, request);
        return ResponseEntity.accepted()
                .location(URI.create("/api/v1/exports/" + job.id()))
                .body(job);
    }

    @GetMapping("/exports/{jobId}")
    public ExportJobResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID jobId) {
        return jobService.get(userId(jwt), jobId);
    }

    @GetMapping("/exports/{jobId}/file")
    public ResponseEntity<Resource> download(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID jobId) {
        Path file = jobService.getDownloadPath(userId(jwt), jobId);
        ExportJobResponse job = jobService.get(userId(jwt), jobId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(job.format().equals("pdf")
                        ? "application/pdf"
                        : "application/vnd.openxmlformats-officedocument.presentationml.presentation"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("slideforge-" + job.presentationId() + "." + job.format()).build().toString())
                .body(new FileSystemResource(file));
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}