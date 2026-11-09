package com.slideforge.api.exports;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ExportJobRepository extends JpaRepository<ExportJob, UUID> {
    Optional<ExportJob> findByIdAndOwnerId(UUID id, UUID ownerId);

    @Query(value = "select * from export_jobs where status = 'QUEUED' order by created_at asc limit 1 for update skip locked", nativeQuery = true)
    Optional<ExportJob> lockNextQueued();

    @Modifying
    @Query("update ExportJob job set job.status = com.slideforge.api.exports.ExportJobStatus.QUEUED where job.status = com.slideforge.api.exports.ExportJobStatus.RUNNING and job.updatedAt < :cutoff")
    int requeueStale(Instant cutoff);
}