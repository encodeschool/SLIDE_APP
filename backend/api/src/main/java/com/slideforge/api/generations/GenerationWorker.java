package com.slideforge.api.generations;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.generations", name = "worker-enabled", havingValue = "true", matchIfMissing = true)
public class GenerationWorker {
    private static final Logger LOGGER = LoggerFactory.getLogger(GenerationWorker.class);

    private final GenerationJobService jobService;
    private final GenerationProvider provider;

    public GenerationWorker(GenerationJobService jobService, GenerationProvider provider) {
        this.jobService = jobService;
        this.provider = provider;
    }

    @Scheduled(fixedDelayString = "${app.generations.poll-interval-ms:1000}")
    public void processNext() {
        jobService.claimNext().ifPresent(job -> {
            if (!provider.isConfigured()) {
                jobService.fail(job.getId(), "AI_PROVIDER_UNCONFIGURED");
                return;
            }
            try {
                jobService.complete(job.getId(),
                        provider.generate(job.getPrompt(), job.getLanguage(), job.getSlideCount()));
            } catch (GenerationProviderException exception) {
                LOGGER.warn("Generation job {} failed with {}", job.getId(), exception.getCode());
                jobService.fail(job.getId(), exception.getCode());
            } catch (Exception exception) {
                LOGGER.warn("Generation job {} failed", job.getId());
                jobService.fail(job.getId(), "AI_PROVIDER_FAILED");
            }
        });
    }
}
