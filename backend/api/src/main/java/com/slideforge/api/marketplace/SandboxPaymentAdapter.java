package com.slideforge.api.marketplace;

import com.slideforge.api.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
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
    private final Clock clock;
    private final Environment environment;
    private final boolean explicitlyEnabled;

    public SandboxPaymentAdapter(
            JdbcTemplate jdbcTemplate,
            MarketplaceService marketplaceService,
            Clock clock,
            Environment environment,
            @Value("${app.payments.sandbox.enabled:false}") boolean explicitlyEnabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.marketplaceService = marketplaceService;
        this.clock = clock;
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

        Instant now = clock.instant();
        String eventId = "sandbox-confirm:" + orderId;
        jdbcTemplate.update(
                """
                INSERT INTO payment_events (id, order_id, provider, provider_event_id, event_type, payload, processed_at, created_at)
                VALUES (?, ?, 'SANDBOX', ?, 'CONFIRMED', '{}'::jsonb, ?, ?)
                ON CONFLICT (provider, provider_event_id) DO NOTHING
                """,
                UUID.randomUUID(),
                orderId,
                eventId,
                now.atOffset(ZoneOffset.UTC),
                now.atOffset(ZoneOffset.UTC));
        jdbcTemplate.update(
                "UPDATE orders SET status = 'PAID', paid_at = ? WHERE id = ? AND status = 'PENDING'",
                now.atOffset(ZoneOffset.UTC),
                orderId);
        jdbcTemplate.update(
                """
                INSERT INTO entitlements (id, user_id, listing_version_id, order_id, granted_at)
                SELECT ?, ?, oi.listing_version_id, ?, ?
                FROM order_items oi
                WHERE oi.order_id = ?
                ON CONFLICT (user_id, listing_version_id) DO NOTHING
                """,
                UUID.randomUUID(),
                buyerId,
                orderId,
                now.atOffset(ZoneOffset.UTC),
                orderId);
        return marketplaceService.orderResponse(orderId);
    }

    private record SandboxOrder(UUID id, UUID buyerId, String status, String provider) {
    }
}
