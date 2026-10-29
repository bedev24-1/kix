-- Les commentaires des directs.
CREATE TABLE IF NOT EXISTS "mb"."live_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL REFERENCES "mb"."streams"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL REFERENCES "mb"."users"("id") ON DELETE CASCADE,
	"texte" text NOT NULL,
	"masque" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_comments_stream_idx" ON "mb"."live_comments" ("stream_id","created_at");
