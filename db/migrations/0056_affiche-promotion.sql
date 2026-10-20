ALTER TABLE "mb"."promotions" ADD COLUMN IF NOT EXISTS "image" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."promotions" ADD COLUMN IF NOT EXISTS "accroche" text DEFAULT '' NOT NULL;
