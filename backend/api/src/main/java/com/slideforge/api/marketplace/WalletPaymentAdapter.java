package com.slideforge.api.marketplace;

import com.slideforge.api.common.exception.ApiException;
import com.slideforge.api.wallet.WalletService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class WalletPaymentAdapter {
    private final JdbcTemplate jdbcTemplate;
    private final WalletService walletService;
    private final MarketplaceService marketplaceService;

    public WalletPaymentAdapter(
            JdbcTemplate jdbcTemplate, WalletService walletService, MarketplaceService marketplaceService) {
        this.jdbcTemplate = jdbcTemplate;
        this.walletService = walletService;
        this.marketplaceService = marketplaceService;
    }

    @Transactional
    public OrderResponse pay(UUID buyerId, UUID orderId) {
        List<PayableOrder> orders = jdbcTemplate.query(
                """
                SELECT status, total_tiyin, currency
                FROM orders
                WHERE id = ? AND buyer_id = ?
                FOR UPDATE
                """,
                (rs, row) -> new PayableOrder(
                        rs.getString("status"), rs.getLong("total_tiyin"), rs.getString("currency")),
                orderId,
                buyerId);
        if (orders.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order was not found");
        }
        PayableOrder order = orders.getFirst();
        if ("PAID".equals(order.status())) {
            return marketplaceService.orderResponse(orderId);
        }
        if (!"PENDING".equals(order.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE", "Order is not awaiting payment");
        }
        if (!"UZS".equals(order.currency())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_CURRENCY", "Wallet checkout only supports UZS");
        }

        walletService.chargeMarketplaceOrder(buyerId, orderId, order.totalTiyin());
        return marketplaceService.markOrderPaid(
                buyerId, orderId, "WALLET", "wallet-pay:" + orderId);
    }

    private record PayableOrder(String status, long totalTiyin, String currency) {
    }
}
