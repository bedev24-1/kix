-- Les cartes de la bannière de la boutique, choisies par l'administration.
CREATE TABLE IF NOT EXISTS "mb"."shop_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'libre' NOT NULL,
	"ref_id" uuid,
	"titre" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"bouton" text DEFAULT 'Voir' NOT NULL,
	"lien" text DEFAULT '/app' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"debut" timestamp with time zone,
	"fin" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shop_banners_ordre_idx" ON "mb"."shop_banners" ("actif","ordre");
