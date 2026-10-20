ALTER TABLE "mb"."popups" ADD COLUMN IF NOT EXISTS "modele" text DEFAULT 'cinema' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."popups" ADD COLUMN IF NOT EXISTS "etiquette" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."popups" ADD COLUMN IF NOT EXISTS "surtitre" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."popups" ADD COLUMN IF NOT EXISTS "accroche" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."promotions" ADD COLUMN IF NOT EXISTS "modele_popup" text DEFAULT 'cinema' NOT NULL;
