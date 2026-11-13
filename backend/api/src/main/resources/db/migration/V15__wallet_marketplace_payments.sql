ALTER TABLE wallet_transactions
    DROP CONSTRAINT wallet_transactions_type_check,
    ADD CONSTRAINT wallet_transactions_type_check
        CHECK (type IN ('TOP_UP', 'WORK', 'WORK_REFUND', 'MARKETPLACE_PURCHASE')),
    DROP CONSTRAINT wallet_transactions_work_units_check,
    ADD CONSTRAINT wallet_transactions_work_units_check
        CHECK (work_units <> 0 OR type = 'MARKETPLACE_PURCHASE'),
    ADD COLUMN payment_method VARCHAR(20);

ALTER TABLE wallet_credit_lots
    ADD COLUMN remaining_tiyin BIGINT;

UPDATE wallet_credit_lots
SET remaining_tiyin = remaining_works::BIGINT * cost_per_work_tiyin;

ALTER TABLE wallet_credit_lots
    ALTER COLUMN remaining_tiyin SET NOT NULL,
    ADD CONSTRAINT wallet_credit_lots_remaining_tiyin_check CHECK (remaining_tiyin >= 0);

ALTER TABLE orders
    DROP CONSTRAINT orders_provider_check,
    ADD CONSTRAINT orders_provider_check
        CHECK (provider IN ('PAYME', 'CLICK', 'UZUM', 'SANDBOX', 'WALLET'));
