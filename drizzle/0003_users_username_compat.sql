ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
--> statement-breakpoint
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
WHERE "username" IS NULL OR length(trim("username"))=0;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_uq" ON "users" ("username");
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
