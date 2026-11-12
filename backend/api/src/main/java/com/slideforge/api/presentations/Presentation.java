package com.slideforge.api.presentations;

import com.slideforge.api.users.model.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "presentations")
public class Presentation {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserAccount owner;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 5)
    private String language;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PresentationStatus status;

    @Column(name = "current_version", nullable = false)
    private int currentVersion;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Presentation() {
    }

    public Presentation(UUID id, UserAccount owner, String title, String language, Instant now) {
        this.id = id;
        this.owner = owner;
        this.title = title;
        this.language = language;
        this.status = PresentationStatus.DRAFT;
        this.currentVersion = 1;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UserAccount getOwner() {
        return owner;
    }

    public String getTitle() {
        return title;
    }

    public String getLanguage() {
        return language;
    }

    public PresentationStatus getStatus() {
        return status;
    }

    public int getCurrentVersion() {
        return currentVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void saveVersion(String title, String language, int version, Instant now) {
        this.title = title;
        this.language = language;
        this.currentVersion = version;
        this.updatedAt = now;
    }

    public void archive(Instant now) {
        this.status = PresentationStatus.ARCHIVED;
        this.deletedAt = now;
        this.updatedAt = now;
    }
}