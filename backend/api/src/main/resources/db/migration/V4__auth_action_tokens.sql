CREATE TABLE auth_action_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     VARCHAR(30) NOT NULL CHECK (purpose IN ('EMAIL_VERIFICATION','PASSWORD_RECOVERY')),
    token_hash  CHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_action_tokens_user_purpose ON auth_action_tokens(user_id, purpose);
