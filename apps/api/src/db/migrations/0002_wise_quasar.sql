CREATE TYPE "public"."anon_session_status" AS ENUM('active', 'ended', 'expired');--> statement-breakpoint
CREATE TYPE "public"."match_queue_status" AS ENUM('waiting', 'matched', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."session_end_reason" AS ENUM('left', 'disconnect', 'expired', 'reported');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anon_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"status" "anon_session_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" "session_end_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"duration_seconds" integer,
	"became_friends" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"status" "match_queue_status" DEFAULT 'waiting' NOT NULL,
	"preferences" jsonb,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_match_queue_user" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_participants" (
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"left_at" timestamp with time zone,
	"sent_friend_request" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_participants_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anon_sessions" ADD CONSTRAINT "anon_sessions_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_session_id_anon_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."anon_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_queue" ADD CONSTRAINT "match_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_queue" ADD CONSTRAINT "match_queue_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_anon_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."anon_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anon_sessions_started" ON "anon_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_history_user_a" ON "match_history" USING btree ("user_a","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_history_user_b" ON "match_history" USING btree ("user_b","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_queue_waiting" ON "match_queue" USING btree ("university_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_queue_heartbeat" ON "match_queue" USING btree ("last_heartbeat_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_participants_user" ON "session_participants" USING btree ("user_id");