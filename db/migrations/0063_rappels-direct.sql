-- « Me prévenir au prochain direct » : un rappel par compte, effacé à l'envoi.
CREATE TABLE IF NOT EXISTS "mb"."rappels_direct" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "mb"."users"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rappels_direct_user_idx" ON "mb"."rappels_direct" ("user_id");
