-- Marketplace and payments. Money is integer tiyin (1 UZS = 100 tiyin); never floating point.
CREATE TABLE listings (
    id          UUID PRIMARY KEY,
    seller_id   UUID NOT NULL REFERENCES users(id),
    title       VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                CHECK (status IN ('DRAFT','SUBMITTED','IN_REVIEW','PUBLISHED','REJECTED','SUSPENDED')),
    rejection_reason TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listings_status ON listings(status);

-- Immutable snapshot: a buyer owns a specific version, so later seller edits never change it.
CREATE TABLE listing_versions (
    id               UUID PRIMARY KEY,
    listing_id       UUID NOT NULL REFERENCES listings(id),
    version          INT  NOT NULL,
    price_tiyin      BIGINT NOT NULL CHECK (price_tiyin >= 0),
    currency         CHAR(3) NOT NULL DEFAULT 'UZS',
    file_object_key  VARCHAR(500) NOT NULL,
    file_sha256      CHAR(64) NOT NULL,
    license_terms    TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, version)
);

CREATE TABLE orders (
    id            UUID PRIMARY KEY,
    buyer_id      UUID NOT NULL REFERENCES users(id),
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED','REFUNDED')),
    total_tiyin   BIGINT NOT NULL CHECK (total_tiyin >= 0),
    currency      CHAR(3) NOT NULL DEFAULT 'UZS',
    provider      VARCHAR(20) NOT NULL CHECK (provider IN ('PAYME','CLICK','UZUM','SANDBOX')),
    idempotency_key VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at       TIMESTAMPTZ,
    UNIQUE (buyer_id, idempotency_key)
);

CREATE TABLE order_items (
    id                 UUID PRIMARY KEY,
    order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    listing_version_id UUID NOT NULL REFERENCES listing_versions(id),
    price_tiyin        BIGINT NOT NULL CHECK (price_tiyin >= 0)
);

-- Raw provider callbacks. The unique key makes webhook retries/replays harmless.
CREATE TABLE payment_events (
    id                UUID PRIMARY KEY,
    order_id          UUID REFERENCES orders(id),
    provider          VARCHAR(20) NOT NULL,
    provider_event_id VARCHAR(120) NOT NULL,
    event_type        VARCHAR(60) NOT NULL,
    payload           JSONB NOT NULL,
    processed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_event_id)
);

-- Granted only after a verified PAID transition; unique so fulfillment cannot duplicate.
CREATE TABLE entitlements (
    id                 UUID PRIMARY KEY,
    user_id            UUID NOT NULL REFERENCES users(id),
    listing_version_id UUID NOT NULL REFERENCES listing_versions(id),
    order_id           UUID NOT NULL REFERENCES orders(id),
    granted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at         TIMESTAMPTZ,
    UNIQUE (user_id, listing_version_id)
);
