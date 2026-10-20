ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "elimination" text DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "vers_gagnant" uuid;--> statement-breakpoint
ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "cote_gagnant" text;--> statement-breakpoint
ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "vers_perdant" uuid;--> statement-breakpoint
ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "cote_perdant" text;--> statement-breakpoint
ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "vide_a" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "vide_b" boolean DEFAULT false NOT NULL;
