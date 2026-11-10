package com.slideforge.api.marketplace;

import jakarta.validation.constraints.NotNull;

public record UpdateMarketplaceCategoryStatusRequest(@NotNull Boolean active) {}
