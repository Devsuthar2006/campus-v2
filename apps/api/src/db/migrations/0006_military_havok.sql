CREATE TYPE "public"."content_status" AS ENUM('visible', 'hidden', 'removed');--> statement-breakpoint
CREATE TYPE "public"."reaction_target_type" AS ENUM('wall_post', 'wall_reply', 'community_post');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('like', 'love', 'laugh', 'insightful', 'support');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'harassment', 'hate', 'nsfw', 'safety', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('user', 'wall_post', 'wall_reply', 'community_post', 'message', 'marketplace_item', 'lost_found_item');--> statement-breakpoint
CREATE TYPE "public"."wall_post_type" AS ENUM('text', 'poll', 'announcement');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_media" (
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_media_post_id_media_id_pk" PRIMARY KEY("post_id","media_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" "reaction_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"type" "reaction_type" DEFAULT 'like' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_reactions_user_target" UNIQUE("user_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" "report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tags_name" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trending_posts" (
	"post_id" uuid PRIMARY KEY NOT NULL,
	"university_id" uuid NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wall_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_wall_categories_slug" UNIQUE("university_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wall_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"text" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wall_poll_votes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wall_poll_votes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wall_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"category_id" uuid,
	"post_type" "wall_post_type" DEFAULT 'text' NOT NULL,
	"body" text,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"reaction_count" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wall_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"reaction_count" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_media" ADD CONSTRAINT "post_media_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trending_posts" ADD CONSTRAINT "trending_posts_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trending_posts" ADD CONSTRAINT "trending_posts_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_categories" ADD CONSTRAINT "wall_categories_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_poll_options" ADD CONSTRAINT "wall_poll_options_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_poll_votes" ADD CONSTRAINT "wall_poll_votes_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_poll_votes" ADD CONSTRAINT "wall_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_poll_votes" ADD CONSTRAINT "wall_poll_votes_option_id_wall_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."wall_poll_options"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_category_id_wall_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."wall_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_replies" ADD CONSTRAINT "wall_replies_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_replies" ADD CONSTRAINT "wall_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookmarks_user" ON "bookmarks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_post_tags_tag" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reactions_target" ON "reactions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_queue" ON "reports" USING btree ("created_at") WHERE status in ('open','reviewing');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_target" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wall_poll_options_post" ON "wall_poll_options" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wall_posts_feed" ON "wall_posts" USING btree ("university_id","created_at") WHERE status = 'visible' and deleted_at is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wall_posts_author" ON "wall_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wall_posts_category" ON "wall_posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wall_replies_post" ON "wall_replies" USING btree ("post_id","created_at");

--> statement-breakpoint
-- Full-text search over post bodies (PUBLIC_WALL.md §5; API_SPEC.md §7 search).
-- Expressed in raw SQL because Drizzle cannot model a functional GIN index.
CREATE INDEX IF NOT EXISTS "idx_wall_posts_fts" ON "wall_posts" USING gin (to_tsvector('english', coalesce("body", '')));
