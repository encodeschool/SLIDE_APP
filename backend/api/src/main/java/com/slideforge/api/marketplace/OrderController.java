package com.slideforge.api.marketplace;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    private final MarketplaceService marketplaceService;
    private final SandboxPaymentAdapter sandboxPaymentAdapter;

    public OrderController(MarketplaceService marketplaceService, SandboxPaymentAdapter sandboxPaymentAdapter) {
        this.marketplaceService = marketplaceService;
        this.sandboxPaymentAdapter = sandboxPaymentAdapter;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateOrderRequest request) {
        OrderResponse order = marketplaceService.createOrder(userId(jwt), request);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + order.id())).body(order);
    }

    @PostMapping("/{orderId}/sandbox-confirm")
    public OrderResponse confirmSandbox(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId) {
        return sandboxPaymentAdapter.confirm(userId(jwt), orderId);
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
