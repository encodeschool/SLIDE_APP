package com.slideforge.api.exports;

import java.time.Instant;
import java.util.UUID;

public record ExportJobResponse(
        UUID id,
        UUID presentationId,
        int version,
        String format,
        ExportJobStatus status,
        String failureCode,
        Instant createdAt,
        Instant updatedAt,
        String downloadUrl) {
    public static ExportJobResponse from(ExportJob job) {
        String downloadUrl = job.getStatus() == ExportJobStatus.SUCCEEDED
                ? "/api/v1/exports/" + job.getId() + "/file"
                : null;
        return new ExportJobResponse(
                job.getId(), job.getPresentationId(), job.getVersion(), job.getFormat().extension(),
                job.getStatus(), job.getFailureCode(), job.getCreatedAt(), job.getUpdatedAt(), downloadUrl);
    }
}