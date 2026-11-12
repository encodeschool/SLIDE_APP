package com.slideforge.api.artifacts;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.common.exception.ApiException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ArtifactService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final ArtifactDocumentValidator validator;
    private final ArtifactGenerationProvider generationProvider;
    private final Clock clock;

    public ArtifactService(
            JdbcTemplate jdbc,
            ObjectMapper mapper,
            ArtifactDocumentValidator validator,
            ArtifactGenerationProvider generationProvider,
            Clock clock) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.validator = validator;
        this.generationProvider = generationProvider;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ArtifactListResponse list(UUID ownerId, int page, int size) {
        if (page < 0 || size < 1 || size > 50) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAGE", "Page must be non-negative and size must be between 1 and 50");
        }
        List<ArtifactSummary> items = jdbc.query("""
                SELECT id, artifact_type, title, language, current_version, created_at, updated_at
                FROM learning_artifacts WHERE owner_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?
                """, (rs, row) -> summary(rs), ownerId, size, (long) page * size);
        Long total = jdbc.queryForObject("SELECT count(*) FROM learning_artifacts WHERE owner_id = ?", Long.class, ownerId);
        return new ArtifactListResponse(items, page, size, total == null ? 0 : total);
    }

    @Transactional
    public ArtifactResponse create(UUID ownerId, ArtifactRequests.Create request) {
        UUID id = UUID.randomUUID();
        JsonNode document = normalize(request.document(), id, request.type());
        var now = clock.instant();
        jdbc.update("""
                INSERT INTO learning_artifacts(id, owner_id, artifact_type, title, language, current_version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                """, id, ownerId, request.type(), document.path("title").asText(),
                document.path("language").asText(), Timestamp.from(now), Timestamp.from(now));
        insertVersion(id, 1, document, now);
        return new ArtifactResponse(id, request.type(), document.path("title").asText(),
                document.path("language").asText(), 1, 1, now, now, document);
    }

    @Transactional(readOnly = true)
    public ArtifactResponse get(UUID ownerId, UUID id, Integer version) {
        ArtifactSummary summary = jdbc.query("""
                SELECT id, artifact_type, title, language, current_version, created_at, updated_at
                FROM learning_artifacts WHERE id = ? AND owner_id = ?
                """, rs -> rs.next() ? summary(rs) : null, id, ownerId);
        if (summary == null) throw notFound();
        int requestedVersion = version == null ? summary.currentVersion() : version;
        JsonNode document = jdbc.query("""
                SELECT document FROM learning_artifact_versions WHERE artifact_id = ? AND version = ?
                """, rs -> rs.next() ? readDocument(rs) : null, id, requestedVersion);
        if (document == null) throw notFound();
        return new ArtifactResponse(id, summary.type(), summary.title(), summary.language(),
                summary.currentVersion(), requestedVersion, summary.createdAt(), summary.updatedAt(), document);
    }

    @Transactional
    public ArtifactResponse save(UUID ownerId, UUID id, ArtifactRequests.Save request) {
        Integer current = jdbc.query("""
                SELECT current_version FROM learning_artifacts WHERE id = ? AND owner_id = ? FOR UPDATE
                """, rs -> rs.next() ? rs.getInt(1) : null, id, ownerId);
        if (current == null) throw notFound();
        if (current != request.expectedVersion()) {
            throw new ApiException(HttpStatus.CONFLICT, "VERSION_CONFLICT", "Artifact changed since it was opened; reload before saving");
        }
        String type = jdbc.queryForObject("SELECT artifact_type FROM learning_artifacts WHERE id = ?", String.class, id);
        JsonNode document = normalize(request.document(), id, type);
        int next = current + 1;
        var now = clock.instant();
        jdbc.update("""
                UPDATE learning_artifacts SET title = ?, language = ?, current_version = ?, updated_at = ?
                WHERE id = ? AND owner_id = ?
                """, document.path("title").asText(), document.path("language").asText(), next, Timestamp.from(now), id, ownerId);
        insertVersion(id, next, document, now);
        ArtifactResponse previous = get(ownerId, id, next);
        return previous;
    }

    @Transactional
    public void delete(UUID ownerId, UUID id) {
        int affected = jdbc.update("DELETE FROM learning_artifacts WHERE id = ? AND owner_id = ?", id, ownerId);
        if (affected == 0) throw notFound();
    }

    public JsonNode draft(ArtifactRequests.Draft request) {
        try {
            boolean validateItemCount = request.itemCount() != null;
            int itemCount = validateItemCount ? request.itemCount() : 5;
            JsonNode generated = generationProvider.generate(
                    request.type(), request.prompt().strip(), request.language(), itemCount);
            JsonNode document = normalize(generated, UUID.randomUUID(), request.type());
            if (validateItemCount && generatedItemCount(document, request.type()) != itemCount) {
                throw new IllegalArgumentException("Generated artifact does not match the requested size");
            }
            return document;
        } catch (IllegalStateException exception) {
            String code = exception.getMessage() == null ? "AI_PROVIDER_FAILED" : exception.getMessage();
            HttpStatus status = "AI_PROVIDER_UNCONFIGURED".equals(code) ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
            throw new ApiException(status, code, "Could not generate an artifact draft");
        } catch (ApiException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GENERATED_ARTIFACT_INVALID", "AI provider returned an invalid artifact");
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GENERATED_ARTIFACT_INVALID", "AI provider returned an invalid artifact");
        }
    }

    private int generatedItemCount(JsonNode document, String type) {
        JsonNode items = switch (type) {
            case "quiz" -> document.path("questions");
            case "crossword" -> document.path("crossword").path("entries");
            default -> document.path("sections");
        };
        return items.isArray() ? items.size() : -1;
    }

    private JsonNode normalize(JsonNode input, UUID id, String type) {
        try {
            if (input != null && mapper.writeValueAsBytes(input).length > 256 * 1024) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ARTIFACT", "Artifact exceeds output size limit");
            }
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Artifact is invalid", exception);
        }
        try {
            return validator.normalize(input, id, type);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ARTIFACT", exception.getMessage());
        }
    }

    private void insertVersion(UUID id, int version, JsonNode document, java.time.Instant now) {
        try {
            jdbc.update("""
                    INSERT INTO learning_artifact_versions(artifact_id, version, document, created_at)
                    VALUES (?, ?, ?::jsonb, ?)
                    """, id, version, mapper.writeValueAsString(document), Timestamp.from(now));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Artifact could not be serialized", exception);
        }
    }

    private ArtifactSummary summary(ResultSet rs, int row) throws SQLException {
        return summary(rs);
    }

    private ArtifactSummary summary(ResultSet rs) throws SQLException {
        return new ArtifactSummary(rs.getObject("id", UUID.class), rs.getString("artifact_type"),
                rs.getString("title"), rs.getString("language"), rs.getInt("current_version"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }

    private JsonNode readDocument(ResultSet rs) throws SQLException {
        try {
            return mapper.readTree(rs.getString("document"));
        } catch (JsonProcessingException exception) {
            throw new SQLException("Stored artifact is invalid", exception);
        }
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "ARTIFACT_NOT_FOUND", "Artifact was not found");
    }
}
