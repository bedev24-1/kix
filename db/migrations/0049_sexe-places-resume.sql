ALTER TABLE "mb"."users" ADD COLUMN IF NOT EXISTS "sexe" text;--> statement-breakpoint
ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "resume_position" text DEFAULT 'haut' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "places_hommes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "places_dames" integer DEFAULT 0 NOT NULL;
