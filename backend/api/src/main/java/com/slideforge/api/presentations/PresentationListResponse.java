package com.slideforge.api.presentations;

import java.util.List;

public record PresentationListResponse(List<PresentationSummaryResponse> items, int page, int size, long total) {
}