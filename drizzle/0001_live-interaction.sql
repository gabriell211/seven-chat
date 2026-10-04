CREATE TABLE "live_bans" (
	"live_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text DEFAULT 'moderation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_bans_live_id_user_id_pk" PRIMARY KEY("live_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "live_battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"live_a_id" uuid NOT NULL,
	"live_b_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"duration_seconds" integer DEFAULT 180 NOT NULL,
	"multiplier_bps" integer DEFAULT 10000 NOT NULL,
	"score_a" integer DEFAULT 0 NOT NULL,
	"score_b" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"winner_live_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"live_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "live_moderators" (
	"live_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_moderators_live_id_user_id_pk" PRIMARY KEY("live_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD COLUMN "context_type" text;--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD COLUMN "context_id" uuid;--> statement-breakpoint
ALTER TABLE "live_bans" ADD CONSTRAINT "live_bans_live_id_live_sessions_id_fk" FOREIGN KEY ("live_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_bans" ADD CONSTRAINT "live_bans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_bans" ADD CONSTRAINT "live_bans_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_battles" ADD CONSTRAINT "live_battles_live_a_id_live_sessions_id_fk" FOREIGN KEY ("live_a_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_battles" ADD CONSTRAINT "live_battles_live_b_id_live_sessions_id_fk" FOREIGN KEY ("live_b_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_battles" ADD CONSTRAINT "live_battles_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_battles" ADD CONSTRAINT "live_battles_winner_live_id_live_sessions_id_fk" FOREIGN KEY ("winner_live_id") REFERENCES "public"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_live_id_live_sessions_id_fk" FOREIGN KEY ("live_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_moderators" ADD CONSTRAINT "live_moderators_live_id_live_sessions_id_fk" FOREIGN KEY ("live_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_moderators" ADD CONSTRAINT "live_moderators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_battles_status_ends_idx" ON "live_battles" USING btree ("status","ends_at");--> statement-breakpoint
CREATE INDEX "live_battles_live_a_idx" ON "live_battles" USING btree ("live_a_id","created_at");--> statement-breakpoint
CREATE INDEX "live_battles_live_b_idx" ON "live_battles" USING btree ("live_b_id","created_at");--> statement-breakpoint
CREATE INDEX "live_comments_live_created_idx" ON "live_comments" USING btree ("live_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_tx_context_idx" ON "gift_transactions" USING btree ("context_type","context_id","created_at");