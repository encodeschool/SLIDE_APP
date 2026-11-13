package com.slideforge.api.wallet;

import java.time.Instant;
import java.util.UUID;

public record WalletTransactionResponse(
        UUID id,
        String type,
        String status,
        long amountTiyin,
        int workUnits,
        String packageCode,
        String paymentMethod,
        UUID referenceId,
        Instant createdAt,
        boolean sandbox) {
}
