package com.slideforge.api.wallet;

import java.util.List;

public record WalletResponse(
        long balanceTiyin,
        int workCredits,
        String currency,
        boolean sandboxEnabled,
        List<WalletPackage> packages) {
}
