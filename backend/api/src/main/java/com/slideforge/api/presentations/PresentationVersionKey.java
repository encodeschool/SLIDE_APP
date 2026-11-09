package com.slideforge.api.presentations;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class PresentationVersionKey implements Serializable {
    private UUID presentationId;
    private int version;

    public PresentationVersionKey() {
    }

    public PresentationVersionKey(UUID presentationId, int version) {
        this.presentationId = presentationId;
        this.version = version;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof PresentationVersionKey that)) return false;
        return version == that.version && Objects.equals(presentationId, that.presentationId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(presentationId, version);
    }
}