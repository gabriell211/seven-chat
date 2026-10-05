CREATE TABLE IF NOT EXISTS "account_security" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "totp_secret" text,
  "totp_enabled_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "public_key" text NOT NULL,
  "counter" integer DEFAULT 0 NOT NULL,
  "transports" text[] DEFAULT '{}' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "webauthn_user_idx" ON "webauthn_credentials" ("user_id");
ALTER TABLE "account_security" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webauthn_credentials" ENABLE ROW LEVEL SECURITY;