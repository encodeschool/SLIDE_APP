package com.slideforge.api.generations;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/generations")
public class GenerationController {
    private final GenerationJobService jobService;

    public GenerationController(GenerationJobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping
    public ResponseEntity<GenerationJobResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateGenerationRequest request) {
        GenerationJobResponse job = jobService.enqueue(userId(jwt), request);
        return ResponseEntity.accepted()
                .location(URI.create("/api/v1/generations/" + job.id()))
                .body(job);
    }

    @GetMapping("/{jobId}")
    public GenerationJobResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID jobId) {
        return jobService.get(userId(jwt), jobId);
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
