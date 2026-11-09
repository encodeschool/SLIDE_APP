ALTER TABLE auth_action_tokens
    DROP CONSTRAINT auth_action_tokens_purpose_check;

ALTER TABLE auth_action_tokens
    ADD CONSTRAINT auth_action_tokens_purpose_check
        CHECK (purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RECOVERY', 'ADMIN_INVITATION'));
