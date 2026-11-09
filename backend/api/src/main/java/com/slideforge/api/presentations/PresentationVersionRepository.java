package com.slideforge.api.presentations;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PresentationVersionRepository extends JpaRepository<PresentationVersion, PresentationVersionKey> {
    Optional<PresentationVersion> findByPresentationIdAndVersion(UUID presentationId, int version);
}