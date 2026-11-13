package com.slideforge.api.marketplace;

import com.slideforge.api.common.exception.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Developer-only confirmation adapter. This intentionally implements no external provider protocol.
 */
@Component
public class SandboxPaymentAdapter {
    private final JdbcTemplate jdbcTemplate;
    private final MarketplaceService marketplaceService;
    private final Environment environment;
    private final boolean explicitlyEnabled;

    public SandboxPaymentAdapter(
            JdbcTemplate jdbcTemplate,
            MarketplaceService marketplaceService,
            Environment environment,
            @Value("${app.payments.sandbox.enabled:false}") boolean explicitlyEnabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.marketplaceService = marketplaceService;
        this.environment = environment;
        this.explicitlyEnabled = explicitlyEnabled;
    }

    public boolean isEnabled() {
        boolean sandboxProfile = List.of(environment.getActiveProfiles()).contains("sandbox");
        boolean productionProfile = List.of(environment.getActiveProfiles()).stream()
                .anyMatch(profile -> profile.equalsIgnoreCase("prod") || profile.equalsIgnoreCase("production"));
        return explicitlyEnabled && sandboxProfile && !productionProfile;
    }

    @Transactional
    public OrderResponse confirm(UUID buyerId, UUID orderId) {
        if (!isEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "SANDBOX_DISABLED", "Sandbox payment confirmation is disabled");
        }
        SandboxOrder order;
        List<SandboxOrder> orders = jdbcTemplate.query(
                "SELECT id, buyer_id, status, provider FROM orders WHERE id = ? AND buyer_id = ? FOR UPDATE",
                (rs, row) -> new SandboxOrder(
                        rs.getObject("id", UUID.class),
                        rs.getObject("buyer_id", UUID.class),
                        rs.getString("status"),
                        rs.getString("provider")),
                orderId,
                buyerId);
        if (orders.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order was not found");
        }
        order = orders.getFirst();
        if ("PAID".equals(order.status())) {
            return marketplaceService.orderResponse(orderId);
        }
        if (!"PENDING".equals(order.status()) || !"SANDBOX".equals(order.provider())) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE", "Order is not awaiting sandbox confirmation");
        }

        return marketplaceService.markOrderPaid(
                buyerId, orderId, "SANDBOX", "sandbox-confirm:" + orderId);
    }

    private record SandboxOrder(UUID id, UUID buyerId, String status, String provider) {
    }
}
