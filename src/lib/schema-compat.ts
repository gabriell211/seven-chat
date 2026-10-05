import { pool } from "@/lib/db";

let authSchemaReady:Promise<void>|null=null;

export function ensureAuthSchemaCompatibility():Promise<void>{
  if(authSchemaReady)return authSchemaReady;

  authSchemaReady=(async()=>{
    const client=await pool.connect();

    try{
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(73421101::bigint)");

      const [idColumn]=(
        await client.query<{udt_name:string;column_default:string|null}>(`
          SELECT udt_name,column_default
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='users' AND column_name='id'
          LIMIT 1
        `)
      ).rows;

      if(!idColumn)throw new Error("USERS_TABLE_NOT_FOUND");
      const userIdType=idColumn.udt_name==="uuid"?"uuid":"text";

      const usernameColumn=await client.query<{exists:boolean}>(`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='users' AND column_name='username'
        ) AS "exists"
      `);

      if(!usernameColumn.rows[0]?.exists){
        await client.query('ALTER TABLE "users" ADD COLUMN "username" text');
        await client.query(`
          UPDATE "users"
          SET "username"=
            left(
              CASE
                WHEN length(regexp_replace(lower(split_part(coalesce("email",''),'@',1)),'[^a-z0-9_.]+','','g'))>=3
                THEN regexp_replace(lower(split_part(coalesce("email",''),'@',1)),'[^a-z0-9_.]+','','g')
                ELSE 'user'
              END,
              12
            )||'_'||left(replace("id"::text,'-',''),8)
          WHERE "username" IS NULL OR length(trim("username"))=0
        `);
      }

      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "users_username_uq" ON "users" ("username")');
      await client.query('ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL');
      await client.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birth_date" timestamp with time zone');
      await client.query('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_status_check"');

      if(idColumn.udt_name==="uuid"){
        await client.query('ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()');
      }else{
        await client.query('ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text');
      }

      const legacyProfileUsername=await client.query<{exists:boolean}>(`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='profiles' AND column_name='username'
        ) AS "exists"
      `);

      if(legacyProfileUsername.rows[0]?.exists){
        await client.query('ALTER TABLE "profiles" ALTER COLUMN "username" DROP NOT NULL');
      }

      await client.query('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "banner_url" text');
      await client.query('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "region" text');
      await client.query('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "languages" text[] NOT NULL DEFAULT ARRAY[]::text[]');
      await client.query('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "interests" text[] NOT NULL DEFAULT ARRAY[]::text[]');
      await client.query('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_private" boolean NOT NULL DEFAULT false');
      await client.query('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_vip" boolean NOT NULL DEFAULT false');

      await client.query(`
        CREATE TABLE IF NOT EXISTS "user_consents"(
          "user_id" ${userIdType} NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "document" text NOT NULL,
          "version" text NOT NULL,
          "accepted_at" timestamp with time zone NOT NULL DEFAULT now(),
          PRIMARY KEY("user_id","document","version")
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "auth_challenges"(
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" ${userIdType} NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "purpose" text NOT NULL,
          "token_hash" text NOT NULL,
          "pending_value" text,
          "expires_at" timestamp with time zone NOT NULL,
          "consumed_at" timestamp with time zone,
          "created_at" timestamp with time zone NOT NULL DEFAULT now()
        )
      `);
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "auth_challenge_token_uq" ON "auth_challenges" ("token_hash")');
      await client.query('CREATE INDEX IF NOT EXISTS "auth_challenge_user_purpose_idx" ON "auth_challenges" ("user_id","purpose","expires_at")');

      await client.query(`
        CREATE TABLE IF NOT EXISTS "user_sessions"(
          "id" uuid PRIMARY KEY,
          "user_id" ${userIdType} NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "device_name" text NOT NULL DEFAULT 'Unknown device',
          "platform" text NOT NULL DEFAULT 'web',
          "user_agent" text,
          "ip_hash" text,
          "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
          "expires_at" timestamp with time zone NOT NULL,
          "revoked_at" timestamp with time zone,
          "created_at" timestamp with time zone NOT NULL DEFAULT now()
        )
      `);
      await client.query('CREATE INDEX IF NOT EXISTS "user_sessions_user_active_idx" ON "user_sessions" ("user_id","revoked_at","expires_at")');
      await client.query('CREATE INDEX IF NOT EXISTS "user_sessions_expires_idx" ON "user_sessions" ("expires_at")');

      await client.query(`
        CREATE TABLE IF NOT EXISTS "account_security"(
          "user_id" ${userIdType} PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
          "totp_secret" text,
          "totp_enabled_at" timestamp with time zone,
          "updated_at" timestamp with time zone NOT NULL DEFAULT now()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "oauth_accounts"(
          "provider" text NOT NULL,
          "provider_account_id" text NOT NULL,
          "user_id" ${userIdType} NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          PRIMARY KEY("provider","provider_account_id")
        )
      `);
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "oauth_provider_user_uq" ON "oauth_accounts" ("provider","user_id")');

      await client.query(`
        CREATE TABLE IF NOT EXISTS "user_roles"(
          "user_id" ${userIdType} NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "role" text NOT NULL,
          "granted_at" timestamp with time zone NOT NULL DEFAULT now(),
          PRIMARY KEY("user_id","role")
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "webauthn_credentials"(
          "id" text PRIMARY KEY,
          "user_id" ${userIdType} NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "public_key" text NOT NULL,
          "counter" integer NOT NULL DEFAULT 0,
          "transports" text[] NOT NULL DEFAULT ARRAY[]::text[],
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          "last_used_at" timestamp with time zone
        )
      `);
      await client.query('CREATE INDEX IF NOT EXISTS "webauthn_user_idx" ON "webauthn_credentials" ("user_id")');

      await client.query("COMMIT");
    }catch(error){
      await client.query("ROLLBACK").catch(()=>undefined);
      throw error;
    }finally{
      client.release();
    }
  })().catch(error=>{
    authSchemaReady=null;
    throw error;
  });

  return authSchemaReady;
}

export const ensureUsersUsernameColumn=ensureAuthSchemaCompatibility;
