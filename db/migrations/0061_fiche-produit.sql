-- La fiche technique et les atouts d'un article, saisis par le vendeur.
ALTER TABLE "mb"."products" ADD COLUMN IF NOT EXISTS "specs" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "mb"."products" ADD COLUMN IF NOT EXISTS "atouts" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- Les avis : un par client et par article, réservés aux acheteurs.
CREATE TABLE IF NOT EXISTS "mb"."product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL REFERENCES "mb"."products"("id") ON DELETE cascade,
	"user_id" uuid NOT NULL REFERENCES "mb"."users"("id") ON DELETE cascade,
	"note" integer NOT NULL CHECK ("note" BETWEEN 1 AND 5),
	"texte" text DEFAULT '' NOT NULL,
	"variant_label" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_reviews_product_user_idx" ON "mb"."product_reviews" ("product_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_reviews_product_idx" ON "mb"."product_reviews" ("product_id");
