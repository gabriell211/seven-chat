-- DB-backed throttling shared by all API instances; keys contain SHA-256 digests, never raw IP/email.
CREATE TABLE auth_throttles (
    scope_key CHAR(64) PRIMARY KEY,
    attempts INTEGER NOT NULL CHECK (attempts > 0),
    window_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    blocked_until TIMESTAMP WITH TIME ZONE
);
CREATE INDEX ix_auth_throttles_window ON auth_throttles(window_started_at);
CREATE INDEX ix_auth_throttles_block ON auth_throttles(blocked_until);
