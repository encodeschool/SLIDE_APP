package com.slideforge.api.wallet;

import java.util.UUID;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/wallet")
public class WalletController {
    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public WalletResponse balance(@AuthenticationPrincipal Jwt jwt) {
        return walletService.balance(userId(jwt));
    }

    @GetMapping("/transactions")
    public List<WalletTransactionResponse> transactions(@AuthenticationPrincipal Jwt jwt) {
        return walletService.transactions(userId(jwt));
    }

    @PostMapping("/topups")
    public WalletResponse topUp(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateWalletTopUpRequest request) {
        return walletService.topUp(userId(jwt), request);
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
