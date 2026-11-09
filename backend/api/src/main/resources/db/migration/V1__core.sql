-- Core: users, roles, sessions, presentations. UUID primary keys, UTC timestamps.
CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(120) NOT NULL,
    locale        VARCHAR(5)   NOT NULL DEFAULT 'ru',
    email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','BLOCKED','DELETED')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL CHECK (role IN ('USER','SELLER','MODERATOR','ADMIN')),
    PRIMARY KEY (user_id, role)
);

-- Only a hash of the refresh token is stored; rotation sets replaced_by / revoked_at.
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE presentations (
    id              UUID PRIMARY KEY,
    owner_id        UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    language        VARCHAR(5)   NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','READY','ARCHIVED')),
    current_version INT          NOT NULL DEFAULT 1,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_presentations_owner ON presentations(owner_id) WHERE deleted_at IS NULL;

-- The canonical deck JSON (schemaVersion 1) lives here; each save is a new immutable row.
CREATE TABLE presentation_versions (
    presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    version         INT  NOT NULL,
    document        JSONB NOT NULL,
    schema_version  INT  NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (presentation_id, version)
);
