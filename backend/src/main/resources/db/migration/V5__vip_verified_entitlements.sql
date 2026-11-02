-- VIP access is an attested server-side entitlement, never a client-supplied balance.
-- No public endpoint issues, extends or revokes entitlements.
CREATE TABLE vip_entitlements (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL
    CHECK (provider IN ('play_billing','app_store','manual_verified')),
  source_reference VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_vip_reference_present CHECK (length(btrim(source_reference)) >= 8)
);
CREATE INDEX ix_vip_active_expiration ON vip_entitlements(expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE chat_groups
  ADD COLUMN vip_only BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX ix_groups_vip_only ON chat_groups(vip_only) WHERE vip_only;
