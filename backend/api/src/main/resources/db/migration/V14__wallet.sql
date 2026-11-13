CREATE TABLE wallets (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance_tiyin BIGINT NOT NULL DEFAULT 0 CHECK (balance_tiyin >= 0),
    work_credits  INT NOT NULL DEFAULT 0 CHECK (work_credits >= 0),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
    id                       UUID PRIMARY KEY,
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                     VARCHAR(20) NOT NULL CHECK (type IN ('TOP_UP', 'WORK', 'WORK_REFUND')),
    status                   VARCHAR(20) NOT NULL CHECK (status IN ('RESERVED', 'SETTLED', 'REFUNDED')),
    package_code             VARCHAR(20),
    amount_tiyin             BIGINT NOT NULL CHECK (amount_tiyin <> 0),
    work_units               INT NOT NULL CHECK (work_units <> 0),
    cost_per_work_tiyin      BIGINT,
    reference_id             UUID,
    credit_lot_id            UUID,
    idempotency_key          VARCHAR(120) NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(user_id, reference_id) WHERE reference_id IS NOT NULL;

CREATE TABLE wallet_credit_lots (
    id                       UUID PRIMARY KEY,
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topup_transaction_id     UUID NOT NULL UNIQUE REFERENCES wallet_transactions(id),
    remaining_works          INT NOT NULL CHECK (remaining_works >= 0),
    cost_per_work_tiyin      BIGINT NOT NULL CHECK (cost_per_work_tiyin > 0),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_credit_lots_available ON wallet_credit_lots(user_id, created_at, id) WHERE remaining_works > 0;
ALTER TABLE wallet_transactions
    ADD CONSTRAINT fk_wallet_transaction_credit_lot
    FOREIGN KEY (credit_lot_id) REFERENCES wallet_credit_lots(id);
