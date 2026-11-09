package com.slideforge.api.presentations;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "presentation_versions")
@IdClass(PresentationVersionKey.class)
public class PresentationVersion {
    @Id
    @Column(name = "presentation_id", nullable = false)
    private UUID presentationId;

    @Id
    @Column(nullable = false)
    private int version;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode document;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PresentationVersion() {
    }

    public PresentationVersion(UUID presentationId, int version, JsonNode document, Instant createdAt) {
        this.presentationId = presentationId;
        this.version = version;
        this.document = document;
        this.schemaVersion = 1;
        this.createdAt = createdAt;
    }

    public JsonNode getDocument() {
        return document;
    }
}