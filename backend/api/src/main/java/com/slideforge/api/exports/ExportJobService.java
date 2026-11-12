package com.slideforge.api.exports;

import com.slideforge.api.common.exception.ApiException;
import com.slideforge.api.presentations.PresentationDetailResponse;
import com.slideforge.api.presentations.PresentationService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExportJobService {
    private final ExportJobRepository repository;
    private final PresentationService presentationService;
    private final Clock clock;
    private final Path storageDirectory;
    private final long staleRunningMinutes;

    public ExportJobService(
            ExportJobRepository repository,
            PresentationService presentationService,
            Clock clock,
            @Value("${app.exports.storage-path}") String storagePath,
            @Value("${app.exports.stale-running-minutes:5}") long staleRunningMinutes) {
        this.repository = repository;
        this.presentationService = presentationService;
        this.clock = clock;
        this.storageDirectory = Path.of(storagePath).toAbsolutePath().normalize();
        this.staleRunningMinutes = staleRunningMinutes;
    }

    @Transactional
    public ExportJobResponse enqueue(UUID ownerId, UUID presentationId, CreateExportRequest request) {
        PresentationDetailResponse presentation = request.version() == null
                ? presentationService.get(ownerId, presentationId)
                : presentationService.getVersion(ownerId, presentationId, request.version());
        Integer requestedVersion = request.version();
        int version = requestedVersion == null ? presentation.currentVersion() : requestedVersion.intValue();
        ExportJob job = new ExportJob(
            UUID.randomUUID(), ownerId, presentationId, version, request.exportFormat(), clock.instant());
        return ExportJobResponse.from(repository.save(job));
    }

    @Transactional(readOnly = true)
    public ExportJobResponse get(UUID ownerId, UUID jobId) {
        return ExportJobResponse.from(findOwned(ownerId, jobId));
    }

    @Transactional(readOnly = true)
    public Path getDownloadPath(UUID ownerId, UUID jobId) {
        ExportJob job = findOwned(ownerId, jobId);
        if (job.getStatus() != ExportJobStatus.SUCCEEDED || job.getFilePath() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "EXPORT_NOT_READY", "The export is not ready for download");
        }
        Path path = Path.of(job.getFilePath()).toAbsolutePath().normalize();
        if (!path.startsWith(storageDirectory) || !Files.isRegularFile(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "EXPORT_FILE_NOT_FOUND", "The export file is not available");
        }
        return path;
    }

    @Transactional
    public Optional<ExportJob> claimNext() {
        repository.requeueStale(clock.instant().minus(Duration.ofMinutes(staleRunningMinutes)));
        return repository.lockNextQueued().map(job -> {
            job.start(clock.instant());
            return job;
        });
    }

    @Transactional
    public void complete(UUID jobId, Path file) {
        ExportJob job = repository.findById(jobId).orElseThrow();
        job.succeed(file.toAbsolutePath().normalize().toString(), clock.instant());
    }

    @Transactional
    public void fail(UUID jobId) {
        repository.findById(jobId).ifPresent(job -> job.fail(clock.instant()));
    }

    public Path artifactPath(ExportJob job) {
        return storageDirectory.resolve(job.getId() + "." + job.getFormat().extension()).normalize();
    }

    private ExportJob findOwned(UUID ownerId, UUID jobId) {
        return repository.findByIdAndOwnerId(jobId, ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EXPORT_NOT_FOUND", "Export was not found"));
    }
}