package com.slideforge.api.wallet;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.slideforge.api.common.exception.ApiException;

@Service
public class WalletService {
    private static final List<WalletPackage> PACKAGES = List.of(
            new WalletPackage("STARTER", 3_600_000L, 18, 200_000L),
            new WalletPackage("VALUE", 7_000_000L, 70, 100_000L));

    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final Environment environment;
    private final boolean sandboxExplicitlyEnabled;

    public WalletService(
            JdbcTemplate jdbc,
            Clock clock,
            Environment environment,
            @Value("${app.payments.sandbox.enabled:false}") boolean sandboxExplicitlyEnabled) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.environment = environment;
        this.sandboxExplicitlyEnabled = sandboxExplicitlyEnabled;
    }

    @Transactional(readOnly = true)
    public WalletResponse balance(UUID userId) {
        List<WalletRow> rows = jdbc.query(
                "SELECT balance_tiyin, work_credits FROM wallets WHERE user_id = ?",
                (rs, row) -> new WalletRow(rs.getLong("balance_tiyin"), rs.getInt("work_credits")),
                userId);
        WalletRow wallet = rows.isEmpty() ? new WalletRow(0, 0) : rows.getFirst();
        return response(wallet);
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> transactions(UUID userId) {
        return jdbc.query(
                """
                SELECT id, type, status, amount_tiyin, work_units, package_code,
                       payment_method, reference_id, created_at
                FROM wallet_transactions
                WHERE user_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 50
                """,
                (rs, row) -> {
                    String type = rs.getString("type");
                    return new WalletTransactionResponse(
                            rs.getObject("id", UUID.class),
                            type,
                            rs.getString("status"),
                            rs.getLong("amount_tiyin"),
                            rs.getInt("work_units"),
                            rs.getString("package_code"),
                            rs.getString("payment_method"),
                            rs.getObject("reference_id", UUID.class),
                            rs.getTimestamp("created_at").toInstant(),
                            "TOP_UP".equals(type));
                },
                userId);
    }

    @Transactional
    public WalletResponse topUp(UUID userId, CreateWalletTopUpRequest request) {
        if (!sandboxEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "SANDBOX_DISABLED", "Sandbox top-ups are disabled");
        }
        WalletPackage selected = PACKAGES.stream()
                .filter(walletPackage -> walletPackage.code().equals(request.packageCode()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PACKAGE", "Wallet package was not found"));
        String paymentMethod = request.paymentMethod() == null ? "SANDBOX" : request.paymentMethod();

        UUID transactionId = UUID.randomUUID();
        List<UUID> inserted = jdbc.query(
                """
                INSERT INTO wallet_transactions
                    (id, user_id, type, status, package_code, amount_tiyin, work_units,
                     cost_per_work_tiyin, payment_method, idempotency_key, created_at, updated_at)
                VALUES (?, ?, 'TOP_UP', 'SETTLED', ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id, idempotency_key) DO NOTHING
                RETURNING id
                """,
                (rs, row) -> rs.getObject(1, UUID.class),
                transactionId,
                userId,
                selected.code(),
                selected.amountTiyin(),
                selected.workUnits(),
                selected.costPerWorkTiyin(),
                paymentMethod,
                request.idempotencyKey(),
                timestamp(),
                timestamp());

        if (inserted.isEmpty()) {
            List<ExistingTopUp> existingRows = jdbc.query(
                    """
                    SELECT package_code, payment_method FROM wallet_transactions
                    WHERE user_id = ? AND idempotency_key = ?
                    """,
                    (rs, row) -> new ExistingTopUp(rs.getString("package_code"), rs.getString("payment_method")),
                    userId,
                    request.idempotencyKey());
            if (existingRows.isEmpty()) {
                throw new ApiException(
                        HttpStatus.CONFLICT,
                        "IDEMPOTENCY_KEY_REUSED",
                        "Idempotency key was already used for a different top-up request");
            }
            ExistingTopUp existing = existingRows.getFirst();
            String existingPaymentMethod = existing.paymentMethod() == null ? "SANDBOX" : existing.paymentMethod();
            if (!selected.code().equals(existing.packageCode()) || !paymentMethod.equals(existingPaymentMethod)) {
                throw new ApiException(
                        HttpStatus.CONFLICT,
                        "IDEMPOTENCY_KEY_REUSED",
                        "Idempotency key was already used for a different top-up request");
            }
            return balance(userId);
        }

        UUID creditLotId = UUID.randomUUID();
        jdbc.update("INSERT INTO wallets (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        jdbc.update(
                "UPDATE wallets SET balance_tiyin = balance_tiyin + ?, work_credits = work_credits + ?, updated_at = ? WHERE user_id = ?",
                selected.amountTiyin(),
                selected.workUnits(),
                timestamp(),
                userId);
        jdbc.update(
                """
                INSERT INTO wallet_credit_lots
                    (id, user_id, topup_transaction_id, remaining_works, remaining_tiyin, cost_per_work_tiyin, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                creditLotId,
                userId,
                transactionId,
                selected.workUnits(),
                selected.amountTiyin(),
                selected.costPerWorkTiyin(),
                timestamp());
        return balance(userId);
    }

    @Transactional
    public WalletResponse chargeMarketplaceOrder(UUID userId, UUID orderId, long amountTiyin) {
        if (amountTiyin <= 0) {
            throw new IllegalArgumentException("Marketplace order amount must be positive");
        }
        WalletRow wallet = lockWallet(userId);
        if (wallet.balanceTiyin() < amountTiyin) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "INSUFFICIENT_BALANCE", "Top up your balance to complete this purchase");
        }

        List<CreditLot> lots = jdbc.query(
                """
                SELECT id, remaining_tiyin, cost_per_work_tiyin
                FROM wallet_credit_lots
                WHERE user_id = ? AND remaining_tiyin > 0
                ORDER BY created_at, id
                FOR UPDATE
                """,
                (rs, row) -> new CreditLot(
                        rs.getObject("id", UUID.class),
                        rs.getLong("remaining_tiyin"),
                        rs.getLong("cost_per_work_tiyin")),
                userId);

        long remaining = amountTiyin;
        int workCredits = 0;
        for (CreditLot lot : lots) {
            if (remaining == 0) break;
            long spent = Math.min(remaining, lot.remainingTiyin());
            long remainingTiyin = lot.remainingTiyin() - spent;
            int remainingWorks = Math.toIntExact(remainingTiyin / lot.costPerWorkTiyin());
            jdbc.update(
                    "UPDATE wallet_credit_lots SET remaining_tiyin = ?, remaining_works = ? WHERE id = ?",
                    remainingTiyin,
                    remainingWorks,
                    lot.id());
            workCredits = Math.addExact(workCredits, remainingWorks);
            remaining -= spent;
        }
        if (remaining != 0) {
            throw new IllegalStateException("Wallet balance exceeds available credit-lot funds");
        }

        jdbc.update(
                "UPDATE wallets SET balance_tiyin = balance_tiyin - ?, work_credits = ?, updated_at = ? WHERE user_id = ?",
                amountTiyin,
                workCredits,
                timestamp(),
                userId);
        jdbc.update(
                """
                INSERT INTO wallet_transactions
                    (id, user_id, type, status, amount_tiyin, work_units, reference_id,
                     idempotency_key, created_at, updated_at)
                VALUES (?, ?, 'MARKETPLACE_PURCHASE', 'SETTLED', ?, 0, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                userId,
                -amountTiyin,
                orderId,
                "order:" + orderId,
                timestamp(),
                timestamp());
        return balance(userId);
    }

    @Transactional
    public void reserveWork(UUID userId, UUID referenceId) {
        WalletRow wallet = lockWallet(userId);
        if (wallet.workCredits() < 1) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "INSUFFICIENT_BALANCE", "Top up your balance to create a work");
        }

        List<CreditLot> lots = jdbc.query(
                """
                SELECT id, remaining_tiyin, cost_per_work_tiyin
                FROM wallet_credit_lots
                WHERE user_id = ? AND remaining_works > 0
                ORDER BY created_at, id
                LIMIT 1
                FOR UPDATE
                """,
                (rs, row) -> new CreditLot(
                        rs.getObject("id", UUID.class),
                        rs.getLong("remaining_tiyin"),
                        rs.getLong("cost_per_work_tiyin")),
                userId);
        if (lots.isEmpty()) {
            throw new IllegalStateException("Wallet work credits do not match available credit lots");
        }
        CreditLot lot = lots.getFirst();
        jdbc.update(
                """
                UPDATE wallet_credit_lots
                SET remaining_works = remaining_works - 1, remaining_tiyin = remaining_tiyin - ?
                WHERE id = ? AND remaining_works > 0 AND remaining_tiyin >= ?
                """,
                lot.costPerWorkTiyin(),
                lot.id(),
                lot.costPerWorkTiyin());
        jdbc.update(
                "UPDATE wallets SET balance_tiyin = balance_tiyin - ?, work_credits = work_credits - 1, updated_at = ? WHERE user_id = ?",
                lot.costPerWorkTiyin(),
                timestamp(),
                userId);
        jdbc.update(
                """
                INSERT INTO wallet_transactions
                    (id, user_id, type, status, amount_tiyin, work_units, cost_per_work_tiyin,
                     reference_id, credit_lot_id, idempotency_key, created_at, updated_at)
                VALUES (?, ?, 'WORK', 'RESERVED', ?, -1, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                userId,
                -lot.costPerWorkTiyin(),
                lot.costPerWorkTiyin(),
                referenceId,
                lot.id(),
                "work:" + referenceId,
                timestamp(),
                timestamp());
    }

    @Transactional
    public void settleWork(UUID userId, UUID referenceId) {
        int updated = jdbc.update(
                """
                UPDATE wallet_transactions SET status = 'SETTLED', updated_at = ?
                WHERE user_id = ? AND reference_id = ? AND type = 'WORK' AND status = 'RESERVED'
                """,
                timestamp(),
                userId,
                referenceId);
        if (updated == 0) {
            String status = findWorkStatus(userId, referenceId);
            if (status != null && !"SETTLED".equals(status)) {
                throw new IllegalStateException("Reserved wallet work could not be settled");
            }
        }
    }

    @Transactional
    public void refundWork(UUID userId, UUID referenceId) {
        List<WorkTransaction> rows = jdbc.query(
                """
                SELECT id, status, amount_tiyin, cost_per_work_tiyin, credit_lot_id
                FROM wallet_transactions
                WHERE user_id = ? AND reference_id = ? AND type = 'WORK'
                FOR UPDATE
                """,
                (rs, row) -> new WorkTransaction(
                        rs.getObject("id", UUID.class),
                        rs.getString("status"),
                        rs.getLong("amount_tiyin"),
                        rs.getLong("cost_per_work_tiyin"),
                        rs.getObject("credit_lot_id", UUID.class)),
                userId,
                referenceId);
        if (rows.isEmpty()) return;
        WorkTransaction transaction = rows.getFirst();
        if ("REFUNDED".equals(transaction.status())) return;
        if (!"RESERVED".equals(transaction.status())) {
            throw new IllegalStateException("Settled wallet work cannot be refunded");
        }

        jdbc.update(
                """
                UPDATE wallet_credit_lots
                SET remaining_works = remaining_works + 1, remaining_tiyin = remaining_tiyin + ?
                WHERE id = ?
                """,
                transaction.costPerWorkTiyin(),
                transaction.creditLotId());
        jdbc.update(
                "UPDATE wallets SET balance_tiyin = balance_tiyin + ?, work_credits = work_credits + 1, updated_at = ? WHERE user_id = ?",
                -transaction.amountTiyin(),
                timestamp(),
                userId);
        jdbc.update(
                "UPDATE wallet_transactions SET status = 'REFUNDED', updated_at = ? WHERE id = ?",
                timestamp(),
                transaction.id());
        jdbc.update(
                """
                INSERT INTO wallet_transactions
                    (id, user_id, type, status, amount_tiyin, work_units, cost_per_work_tiyin,
                     reference_id, credit_lot_id, idempotency_key, created_at, updated_at)
                VALUES (?, ?, 'WORK_REFUND', 'SETTLED', ?, 1, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                userId,
                -transaction.amountTiyin(),
                transaction.costPerWorkTiyin(),
                referenceId,
                transaction.creditLotId(),
                "refund:" + referenceId,
                timestamp(),
                timestamp());
    }

    private WalletRow lockWallet(UUID userId) {
        jdbc.update("INSERT INTO wallets (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        return jdbc.queryForObject(
                "SELECT balance_tiyin, work_credits FROM wallets WHERE user_id = ? FOR UPDATE",
                (rs, row) -> new WalletRow(rs.getLong("balance_tiyin"), rs.getInt("work_credits")),
                userId);
    }

    private String findWorkStatus(UUID userId, UUID referenceId) {
        List<String> statuses = jdbc.query(
                "SELECT status FROM wallet_transactions WHERE user_id = ? AND reference_id = ? AND type = 'WORK'",
                (rs, row) -> rs.getString("status"),
                userId,
                referenceId);
        return statuses.isEmpty() ? null : statuses.getFirst();
    }

    private WalletResponse response(WalletRow wallet) {
        return new WalletResponse(wallet.balanceTiyin(), wallet.workCredits(), "UZS", sandboxEnabled(), PACKAGES);
    }

    private Timestamp timestamp() {
        return Timestamp.from(clock.instant());
    }

    private boolean sandboxEnabled() {
        List<String> profiles = List.of(environment.getActiveProfiles());
        boolean sandboxProfile = profiles.stream().anyMatch(profile -> profile.equalsIgnoreCase("sandbox"));
        boolean productionProfile = profiles.stream()
                .anyMatch(profile -> profile.equalsIgnoreCase("prod") || profile.equalsIgnoreCase("production"));
        return sandboxExplicitlyEnabled && sandboxProfile && !productionProfile;
    }

    private record WalletRow(long balanceTiyin, int workCredits) {
    }

    private record CreditLot(UUID id, long remainingTiyin, long costPerWorkTiyin) {
    }

    private record ExistingTopUp(String packageCode, String paymentMethod) {
    }

    private record WorkTransaction(
            UUID id, String status, long amountTiyin, long costPerWorkTiyin, UUID creditLotId) {
    }
}
