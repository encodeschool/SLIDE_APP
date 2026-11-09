package com.slideforge.api.generations;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "generation_jobs")
public class GenerationJob {
    @Id
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false, length = 4000)
    private String prompt;

    @Column(nullable = false, length = 5)
    private String language;

    @Column(name = "slide_count", nullable = false)
    private int slideCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GenerationJobStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_document", columnDefinition = "jsonb")
    private JsonNode resultDocument;

    @Column(name = "failure_code", length = 40)
    private String failureCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GenerationJob() {
    }

    public GenerationJob(UUID id, UUID ownerId, CreateGenerationRequest request, Instant now) {
        this.id = id;
        this.ownerId = ownerId;
        this.prompt = request.prompt().strip();
        this.language = request.language();
        this.slideCount = request.slideCount();
        this.status = GenerationJobStatus.QUEUED;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getPrompt() { return prompt; }
    public String getLanguage() { return language; }
    public int getSlideCount() { return slideCount; }
    public GenerationJobStatus getStatus() { return status; }
    public JsonNode getResultDocument() { return resultDocument; }
    public String getFailureCode() { return failureCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void start(Instant now) {
        status = GenerationJobStatus.RUNNING;
        updatedAt = now;
    }

    public void succeed(JsonNode document, Instant now) {
        status = GenerationJobStatus.SUCCEEDED;
        resultDocument = document;
        failureCode = null;
        updatedAt = now;
    }

    public void fail(String code, Instant now) {
        status = GenerationJobStatus.FAILED;
        resultDocument = null;
        failureCode = code;
        updatedAt = now;
    }
}
