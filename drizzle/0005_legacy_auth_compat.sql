ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birth_date" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_status_check";
--> statement-breakpoint
DO $$
DECLARE
  users_id_type text;
  has_profile_username boolean;
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod)
    INTO users_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid=a.attrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relname='users'
    AND a.attname='id'
    AND a.attnum>0
    AND NOT a.attisdropped;

  IF users_id_type='uuid' THEN
    EXECUTE 'ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()';
  ELSE
    EXECUTE 'ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='username'
  ) INTO has_profile_username;

  IF has_profile_username THEN
    EXECUTE 'ALTER TABLE "profiles" ALTER COLUMN "username" DROP NOT NULL';
  END IF;

  EXECUTE 'ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "banner_url" text';
  EXECUTE 'ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "region" text';
  EXECUTE 'ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "languages" text[] NOT NULL DEFAULT ARRAY[]::text[]';
  EXECUTE 'ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "interests" text[] NOT NULL DEFAULT ARRAY[]::text[]';
  EXECUTE 'ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_private" boolean NOT NULL DEFAULT false';
  EXECUTE 'ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_vip" boolean NOT NULL DEFAULT false';

  IF to_regclass('public.user_consents') IS NULL THEN
    EXECUTE format('CREATE TABLE "user_consents"("user_id" %s NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"document" text NOT NULL,"version" text NOT NULL,"accepted_at" timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY("user_id","document","version"))',users_id_type);
  END IF;

  IF to_regclass('public.auth_challenges') IS NULL THEN
    EXECUTE format('CREATE TABLE "auth_challenges"("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" %s NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"purpose" text NOT NULL,"token_hash" text NOT NULL,"pending_value" text,"expires_at" timestamp with time zone NOT NULL,"consumed_at" timestamp with time zone,"created_at" timestamp with time zone NOT NULL DEFAULT now())',users_id_type);
  END IF;

  IF to_regclass('public.user_sessions') IS NULL THEN
    EXECUTE format('CREATE TABLE "user_sessions"("id" uuid PRIMARY KEY,"user_id" %s NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"device_name" text NOT NULL DEFAULT ''Unknown device'',"platform" text NOT NULL DEFAULT ''web'',"user_agent" text,"ip_hash" text,"last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),"expires_at" timestamp with time zone NOT NULL,"revoked_at" timestamp with time zone,"created_at" timestamp with time zone NOT NULL DEFAULT now())',users_id_type);
  END IF;

  IF to_regclass('public.account_security') IS NULL THEN
    EXECUTE format('CREATE TABLE "account_security"("user_id" %s PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,"totp_secret" text,"totp_enabled_at" timestamp with time zone,"updated_at" timestamp with time zone NOT NULL DEFAULT now())',users_id_type);
  END IF;

  IF to_regclass('public.oauth_accounts') IS NULL THEN
    EXECUTE format('CREATE TABLE "oauth_accounts"("provider" text NOT NULL,"provider_account_id" text NOT NULL,"user_id" %s NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"created_at" timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY("provider","provider_account_id"))',users_id_type);
  END IF;

  IF to_regclass('public.user_roles') IS NULL THEN
    EXECUTE format('CREATE TABLE "user_roles"("user_id" %s NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"role" text NOT NULL,"granted_at" timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY("user_id","role"))',users_id_type);
  END IF;

  IF to_regclass('public.webauthn_credentials') IS NULL THEN
    EXECUTE format('CREATE TABLE "webauthn_credentials"("id" text PRIMARY KEY,"user_id" %s NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"public_key" text NOT NULL,"counter" integer NOT NULL DEFAULT 0,"transports" text[] NOT NULL DEFAULT ARRAY[]::text[],"created_at" timestamp with time zone NOT NULL DEFAULT now(),"last_used_at" timestamp with time zone)',users_id_type);
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_challenge_token_uq" ON "auth_challenges" ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_challenge_user_purpose_idx" ON "auth_challenges" ("user_id","purpose","expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_active_idx" ON "user_sessions" ("user_id","revoked_at","expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_expires_idx" ON "user_sessions" ("expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_provider_user_uq" ON "oauth_accounts" ("provider","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webauthn_user_idx" ON "webauthn_credentials" ("user_id");
