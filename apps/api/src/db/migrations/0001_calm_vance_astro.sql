CREATE TYPE "public"."friend_request_policy" AS ENUM('everyone', 'campus', 'none');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('clear', 'flagged', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('campus', 'friends', 'private');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_interests_name" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"show_last_seen" boolean DEFAULT true NOT NULL,
	"show_online_status" boolean DEFAULT true NOT NULL,
	"send_read_receipts" boolean DEFAULT true NOT NULL,
	"profile_visibility" "profile_visibility" DEFAULT 'campus' NOT NULL,
	"allow_friend_requests" "friend_request_policy" DEFAULT 'everyone' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_privacy_settings_user" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"avatar_media_id" uuid,
	"gender" "gender",
	"bio" text,
	"moderation_status" "moderation_status" DEFAULT 'clear' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_profiles_user" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_interests" (
	"user_id" uuid NOT NULL,
	"interest_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_interests_user_id_interest_id_pk" PRIMARY KEY("user_id","interest_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_interest_id_interests_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_interests_interest" ON "user_interests" USING btree ("interest_id");