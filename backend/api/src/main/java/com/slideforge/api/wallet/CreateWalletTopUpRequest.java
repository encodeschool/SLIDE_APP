package com.slideforge.api.wallet;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateWalletTopUpRequest(
        @NotBlank @Pattern(regexp = "STARTER|VALUE") String packageCode,
        @NotBlank @Size(max = 100) String idempotencyKey,
        @Pattern(regexp = "CLICK|PAYME|UZUM|VISA|MASTERCARD|HUMO|UZCARD") String paymentMethod) {
    public CreateWalletTopUpRequest(String packageCode, String idempotencyKey) {
        this(packageCode, idempotencyKey, null);
    }
}
