ALTER TABLE "mb"."users" ADD COLUMN IF NOT EXISTS "certifie" text;--> statement-breakpoint
ALTER TABLE "mb"."users" ADD COLUMN IF NOT EXISTS "certifie_le" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mb"."venues" ADD COLUMN IF NOT EXISTS "certifiee" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "mb"."profils_speciaux" ADD COLUMN IF NOT EXISTS "motif" text;
