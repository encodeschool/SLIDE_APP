package com.slideforge.api.exports;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "export_jobs")
public class ExportJob {
    @Id
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "presentation_id", nullable = false)
    private UUID presentationId;

    @Column(nullable = false)
    private int version;

    @Enumerated(EnumType.STRING)
    @Column(name = "export_format", nullable = false, length = 8)
    private ExportFormat format;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExportJobStatus status;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "failure_code", length = 40)
    private String failureCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ExportJob() {
    }

    public ExportJob(UUID id, UUID ownerId, UUID presentationId, int version, ExportFormat format, Instant now) {
        this.id = id;
        this.ownerId = ownerId;
        this.presentationId = presentationId;
        this.version = version;
        this.format = format;
        this.status = ExportJobStatus.QUEUED;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public UUID getPresentationId() { return presentationId; }
    public int getVersion() { return version; }
    public ExportFormat getFormat() { return format; }
    public ExportJobStatus getStatus() { return status; }
    public String getFilePath() { return filePath; }
    public String getFailureCode() { return failureCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void start(Instant now) {
        this.status = ExportJobStatus.RUNNING;
        this.updatedAt = now;
    }

    public void succeed(String filePath, Instant now) {
        this.status = ExportJobStatus.SUCCEEDED;
        this.filePath = filePath;
        this.failureCode = null;
        this.updatedAt = now;
    }

    public void fail(Instant now) {
        this.status = ExportJobStatus.FAILED;
        this.failureCode = "EXPORT_FAILED";
        this.updatedAt = now;
    }
}