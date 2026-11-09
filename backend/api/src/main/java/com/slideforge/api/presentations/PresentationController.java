package com.slideforge.api.presentations;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/presentations")
public class PresentationController {
    private final PresentationService presentationService;

    public PresentationController(PresentationService presentationService) {
        this.presentationService = presentationService;
    }

    @GetMapping
    public PresentationListResponse list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return presentationService.list(userId(jwt), page, size);
    }

    @PostMapping
    public ResponseEntity<PresentationDetailResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePresentationRequest request) {
        PresentationDetailResponse created = presentationService.create(userId(jwt), request);
        return ResponseEntity.created(URI.create("/api/v1/presentations/" + created.id())).body(created);
    }

    @GetMapping("/{presentationId}")
    public PresentationDetailResponse get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID presentationId) {
        return presentationService.get(userId(jwt), presentationId);
    }

    @GetMapping("/{presentationId}/versions/{version}")
    public PresentationDetailResponse getVersion(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID presentationId,
            @PathVariable int version) {
        return presentationService.getVersion(userId(jwt), presentationId, version);
    }

    @PutMapping("/{presentationId}")
    public PresentationDetailResponse save(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID presentationId,
            @Valid @RequestBody SavePresentationRequest request) {
        return presentationService.save(userId(jwt), presentationId, request);
    }

    @DeleteMapping("/{presentationId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID presentationId) {
        presentationService.delete(userId(jwt), presentationId);
        return ResponseEntity.noContent().build();
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}