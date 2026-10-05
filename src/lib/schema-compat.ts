import { pool } from "@/lib/db";

let usersUsernameReady: Promise<void> | null = null;

export function ensureUsersUsernameColumn(): Promise<void> {
  if (usersUsernameReady) return usersUsernameReady;

  usersUsernameReady = (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(73421101::bigint)");
      const check = await client.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='users' AND column_name='username'
        ) AS "exists"
      `);
      if (!check.rows[0]?.exists) {
        await client.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text');
        await client.query(`
          UPDATE "users"
          SET "username" =
            left(
              CASE
                WHEN length(regexp_replace(lower(split_part(coalesce("email", ''), '@', 1)), '[^a-z0-9_.]+', '', 'g')) >= 3
                THEN regexp_replace(lower(split_part(coalesce("email", ''), '@', 1)), '[^a-z0-9_.]+', '', 'g')
                ELSE 'user'
              END,
              12
            ) || '_' || left(replace("id"::text, '-', ''), 8)
          WHERE "username" IS NULL OR length(trim("username"))=0
        `);
        await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "users_username_uq" ON "users" ("username")');
        await client.query('ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL');
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  })().catch((error) => {
    usersUsernameReady = null;
    throw error;
  });

  return usersUsernameReady;
}
