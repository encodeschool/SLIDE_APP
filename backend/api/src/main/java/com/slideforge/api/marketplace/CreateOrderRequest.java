package com.slideforge.api.marketplace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateOrderRequest(@NotNull UUID listingId, @NotBlank @Size(max = 100) String idempotencyKey) {
}
