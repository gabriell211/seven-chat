-- Existing accounts must never be considered verified merely because they can log in.
ALTER TABLE accounts ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE email_verification_codes (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    code_hash CHAR(64) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_attempts SMALLINT NOT NULL DEFAULT 0
        CHECK (failed_attempts BETWEEN 0 AND 5)
);
CREATE INDEX ix_email_verification_expiry ON email_verification_codes(expires_at);
