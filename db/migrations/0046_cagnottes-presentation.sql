ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "presentation" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "cagnottes" jsonb DEFAULT '[]'::jsonb NOT NULL;
