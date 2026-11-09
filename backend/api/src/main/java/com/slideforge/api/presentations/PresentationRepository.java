package com.slideforge.api.presentations;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PresentationRepository extends JpaRepository<Presentation, UUID> {
    Page<Presentation> findAllByOwner_IdAndDeletedAtIsNullOrderByUpdatedAtDesc(UUID ownerId, Pageable pageable);

    @Query("select presentation from Presentation presentation "
            + "where presentation.id = :presentationId and presentation.owner.id = :ownerId "
            + "and presentation.deletedAt is null")
    Optional<Presentation> findOwned(
            @Param("presentationId") UUID presentationId,
            @Param("ownerId") UUID ownerId);

}