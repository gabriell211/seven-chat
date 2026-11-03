-- Only the account ID and the HMAC digest are persisted, never a raw reset code.
CREATE TABLE password_recovery_codes (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    code_hash CHAR(64) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_attempts SMALLINT NOT NULL DEFAULT 0
        CHECK (failed_attempts BETWEEN 0 AND 5)
);

CREATE INDEX ix_password_recovery_expiry
    ON password_recovery_codes(expires_at);
