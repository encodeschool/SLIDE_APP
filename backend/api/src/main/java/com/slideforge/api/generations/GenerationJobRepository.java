package com.slideforge.api.generations;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface GenerationJobRepository extends JpaRepository<GenerationJob, UUID> {
    Optional<GenerationJob> findByIdAndOwnerId(UUID id, UUID ownerId);

    long countByOwnerIdAndStatusIn(UUID ownerId, java.util.Collection<GenerationJobStatus> statuses);

    @Modifying
    @Query(value = "delete from generation_jobs where owner_id = :ownerId and status in ('SUCCEEDED','FAILED') and id not in "
            + "(select id from generation_jobs where owner_id = :ownerId and status in ('SUCCEEDED','FAILED') "
            + "order by created_at desc limit 19)", nativeQuery = true)
    int trimCompletedHistory(UUID ownerId);

    @Query(value = "select * from generation_jobs where status = 'QUEUED' order by created_at asc limit 1 for update skip locked", nativeQuery = true)
    Optional<GenerationJob> lockNextQueued();

    @Modifying
    @Query(value = "update generation_jobs set status = 'FAILED', failure_code = 'GENERATION_INTERRUPTED', updated_at = now() where status = 'RUNNING' and updated_at < :cutoff", nativeQuery = true)
    int failInterrupted(Instant cutoff);
}
