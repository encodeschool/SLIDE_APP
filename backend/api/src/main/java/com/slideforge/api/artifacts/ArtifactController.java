package com.slideforge.api.artifacts;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import com.slideforge.api.exports.RendererClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
@RequestMapping("/api/v1/artifacts")
public class ArtifactController {
    private final ArtifactService service;
    private final RendererClient renderer;

    public ArtifactController(ArtifactService service, RendererClient renderer) {
        this.service = service;
        this.renderer = renderer;
    }

    @GetMapping
    public ArtifactListResponse list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(userId(jwt), page, size);
    }

    @PostMapping("/draft")
    public ResponseEntity<?> draft(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ArtifactRequests.Draft request) {
        return ResponseEntity.ok(java.util.Map.of("document", service.draft(request)));
    }

    @PostMapping
    public ResponseEntity<ArtifactResponse> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ArtifactRequests.Create request) {
        ArtifactResponse created = service.create(userId(jwt), request);
        return ResponseEntity.created(URI.create("/api/v1/artifacts/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public ArtifactResponse get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestParam(required = false) Integer version) {
        return service.get(userId(jwt), id, version);
    }

    @GetMapping("/{id}/exports/{format}")
    public ResponseEntity<byte[]> export(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @PathVariable String format,
            @RequestParam(required = false) Integer version) {
        if (!"docx".equals(format) && !"pdf".equals(format)) {
            throw new com.slideforge.api.common.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "UNSUPPORTED_EXPORT", "Use docx or pdf");
        }
        ArtifactResponse artifact = service.get(userId(jwt), id, version);
        byte[] bytes = renderer.renderArtifact(artifact.document(), format);
        String contentType = "docx".equals(format)
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : MediaType.APPLICATION_PDF_VALUE;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"artifact-" + id + "." + format + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(bytes);
    }

    @PutMapping("/{id}")
    public ArtifactResponse save(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody ArtifactRequests.Save request) {
        return service.save(userId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        service.delete(userId(jwt), id);
        return ResponseEntity.noContent().build();
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
