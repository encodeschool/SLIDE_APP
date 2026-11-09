package com.slideforge.api.generations;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.common.ApiException;
import com.slideforge.api.presentations.DeckDocumentValidator;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GenerationJobService {
    private static final int MAX_ACTIVE_JOBS_PER_OWNER = 3;
    private static final int MAX_RESULT_BYTES = 256 * 1024;
    private static final List<GenerationJobStatus> ACTIVE_STATUSES = List.of(
            GenerationJobStatus.QUEUED, GenerationJobStatus.RUNNING);

    private final GenerationJobRepository repository;
    private final DeckDocumentValidator documentValidator;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public GenerationJobService(
            GenerationJobRepository repository,
            DeckDocumentValidator documentValidator,
            ObjectMapper objectMapper,
            Clock clock) {
        this.repository = repository;
        this.documentValidator = documentValidator;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional
    public GenerationJobResponse enqueue(UUID ownerId, CreateGenerationRequest request) {
        if (repository.countByOwnerIdAndStatusIn(ownerId, ACTIVE_STATUSES) >= MAX_ACTIVE_JOBS_PER_OWNER) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "GENERATION_LIMIT_REACHED",
                    "At most three generation jobs may be active at once");
        }
        repository.trimCompletedHistory(ownerId);
        GenerationJob job = repository.save(new GenerationJob(UUID.randomUUID(), ownerId, request, clock.instant()));
        return GenerationJobResponse.from(job);
    }

    @Transactional(readOnly = true)
    public GenerationJobResponse get(UUID ownerId, UUID jobId) {
        return GenerationJobResponse.from(findOwned(ownerId, jobId));
    }

    @Transactional
    public Optional<GenerationJob> claimNext() {
        repository.failInterrupted(clock.instant().minus(Duration.ofMinutes(2)));
        return repository.lockNextQueued().map(job -> {
            job.start(clock.instant());
            return job;
        });
    }

    @Transactional
    public void complete(UUID jobId, JsonNode generated) {
        GenerationJob job = repository.findById(jobId).orElseThrow();
        JsonNode normalized;
        try {
            if (generated == null || !generated.isObject()
                    || generated.path("slides").size() != job.getSlideCount()) {
                throw new IllegalArgumentException("Generated slide count does not match request");
            }
            String title = documentValidator.title(generated);
            normalized = documentValidator.normalize(generated, job.getId(), title, job.getLanguage());
            if (objectMapper.writeValueAsBytes(normalized).length > MAX_RESULT_BYTES) {
                throw new IllegalArgumentException("Generated presentation exceeds output limit");
            }
        } catch (Exception exception) {
            job.fail("GENERATED_DECK_INVALID", clock.instant());
            return;
        }
        job.succeed(normalized, clock.instant());
    }

    @Transactional
    public void fail(UUID jobId, String code) {
        repository.findById(jobId).ifPresent(job -> job.fail(code, clock.instant()));
    }

    private GenerationJob findOwned(UUID ownerId, UUID jobId) {
        return repository.findByIdAndOwnerId(jobId, ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "GENERATION_NOT_FOUND", "Generation was not found"));
    }
}
