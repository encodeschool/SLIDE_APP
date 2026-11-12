package com.slideforge.api.artifacts;

import java.util.List;

public record ArtifactListResponse(List<ArtifactSummary> items, int page, int size, long total) {}
