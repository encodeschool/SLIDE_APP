package com.slideforge.api.presentations;

import com.fasterxml.jackson.databind.JsonNode;
import com.slideforge.api.common.exception.ApiException;
import com.slideforge.api.users.model.UserAccount;
import com.slideforge.api.users.repository.UserRepository;
import com.slideforge.api.users.model.UserStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PresentationService {
    private final PresentationRepository presentationRepository;
    private final PresentationVersionRepository versionRepository;
    private final UserRepository userRepository;
    private final DeckDocumentValidator documentValidator;
    private final Clock clock;
    private final EntityManager entityManager;

    public PresentationService(
            PresentationRepository presentationRepository,
            PresentationVersionRepository versionRepository,
            UserRepository userRepository,
            DeckDocumentValidator documentValidator,
            Clock clock,
            EntityManager entityManager) {
        this.presentationRepository = presentationRepository;
        this.versionRepository = versionRepository;
        this.userRepository = userRepository;
        this.documentValidator = documentValidator;
        this.clock = clock;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public PresentationListResponse list(UUID ownerId, int page, int size) {
        if (page < 0 || size < 1 || size > 50) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAGE", "Page must be non-negative and size must be between 1 and 50");
        }
        Page<Presentation> results = presentationRepository.findAllByOwner_IdAndDeletedAtIsNullOrderByUpdatedAtDesc(
                ownerId,
                PageRequest.of(page, size));
        return new PresentationListResponse(
                results.getContent().stream().map(PresentationSummaryResponse::from).toList(),
                results.getNumber(),
                results.getSize(),
                results.getTotalElements());
    }

    @Transactional
    public PresentationDetailResponse create(UUID ownerId, CreatePresentationRequest request) {
        UserAccount owner = userRepository.findById(ownerId)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(this::notFound);
        UUID presentationId = UUID.randomUUID();
        JsonNode document = documentValidator.normalize(request.document(), presentationId, request.title(), request.language());
        Instant now = clock.instant();
        Presentation presentation = presentationRepository.saveAndFlush(
                new Presentation(presentationId, owner, documentValidator.title(document), documentValidator.language(document), now));
        versionRepository.saveAndFlush(new PresentationVersion(presentationId, 1, document, now));
        return detail(presentation, document);
    }

    @Transactional(readOnly = true)
    public PresentationDetailResponse get(UUID ownerId, UUID presentationId) {
        Presentation presentation = findOwned(ownerId, presentationId);
        JsonNode document = versionRepository.findByPresentationIdAndVersion(presentationId, presentation.getCurrentVersion())
                .orElseThrow(this::notFound)
                .getDocument();
        return detail(presentation, document);
    }

    @Transactional(readOnly = true)
    public PresentationDetailResponse getVersion(UUID ownerId, UUID presentationId, int version) {
        Presentation presentation = findOwned(ownerId, presentationId);
        JsonNode document = versionRepository.findByPresentationIdAndVersion(presentationId, version)
                .orElseThrow(this::notFound)
                .getDocument();
        return detail(presentation, document);
    }

    @Transactional
    public PresentationDetailResponse save(UUID ownerId, UUID presentationId, SavePresentationRequest request) {
        Presentation presentation = lockOwned(ownerId, presentationId);
        if (presentation.getCurrentVersion() != request.expectedVersion()) {
            throw new ApiException(HttpStatus.CONFLICT, "VERSION_CONFLICT", "Presentation changed since it was opened; reload before saving");
        }
        JsonNode document = documentValidator.normalize(
                request.document(),
                presentationId,
                documentValidator.title(request.document()),
                documentValidator.language(request.document()));
        Instant now = clock.instant();
        int newVersion = presentation.getCurrentVersion() + 1;
        presentation.saveVersion(documentValidator.title(document), documentValidator.language(document), newVersion, now);
        versionRepository.saveAndFlush(new PresentationVersion(presentationId, newVersion, document, now));
        return detail(presentation, document);
    }

    @Transactional
    public void delete(UUID ownerId, UUID presentationId) {
        Presentation presentation = lockOwned(ownerId, presentationId);
        presentation.archive(clock.instant());
    }

    private Presentation findOwned(UUID ownerId, UUID presentationId) {
        return presentationRepository.findOwned(presentationId, ownerId).orElseThrow(this::notFound);
    }

    private Presentation lockOwned(UUID ownerId, UUID presentationId) {
        Presentation presentation = findOwned(ownerId, presentationId);
        entityManager.lock(presentation, LockModeType.PESSIMISTIC_WRITE);
        return presentation;
    }

    private PresentationDetailResponse detail(Presentation presentation, JsonNode document) {
        return new PresentationDetailResponse(
                presentation.getId(),
                presentation.getTitle(),
                presentation.getLanguage(),
                presentation.getStatus(),
                presentation.getCurrentVersion(),
                presentation.getCreatedAt(),
                presentation.getUpdatedAt(),
                document);
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "PRESENTATION_NOT_FOUND", "Presentation was not found");
    }
}