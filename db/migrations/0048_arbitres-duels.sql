ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "referee_id" uuid REFERENCES "mb"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "mb"."tournament_matches" ADD COLUMN IF NOT EXISTS "table_label" text DEFAULT '' NOT NULL;
