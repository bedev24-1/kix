-- Réservation de table : paiement à la caisse, tables réelles pour toutes les salles, créneaux venus des salles partenaires.

-- Comment une salle se fait payer une réservation : « caisse » (rien en ligne, on paie après avoir joué)
-- ou « acompte » (Mobile Money en ligne avant de retenir la table).
ALTER TABLE "mb"."venues" ADD COLUMN IF NOT EXISTS "paiement_reservation" text DEFAULT 'caisse' NOT NULL;
--> statement-breakpoint
-- Chaque salle reçoit ses tables réelles d'après le nombre déjà saisi : « Billard 1 » … « Billard N »,
-- 5 000 F de l'heure, sans acompte. Une salle qui a déjà des tables n'est pas touchée.
INSERT INTO "mb"."venue_tables" ("venue_id", "label", "kind", "hourly_rate", "deposit", "status", "seats", "sort", "active")
SELECT v."id", 'Billard ' || n, 'pool', 5000, 0, 'free', 4, n, true
FROM "mb"."venues" v
CROSS JOIN LATERAL generate_series(1, GREATEST(v."tables", 0)) AS n
WHERE NOT EXISTS (SELECT 1 FROM "mb"."venue_tables" t WHERE t."venue_id" = v."id");
--> statement-breakpoint
UPDATE "mb"."venues" v SET "free_tables" = (
  SELECT count(*) FROM "mb"."venue_tables" t WHERE t."venue_id" = v."id" AND t."active" AND t."status" = 'free'
) WHERE EXISTS (SELECT 1 FROM "mb"."venue_tables" t WHERE t."venue_id" = v."id");
--> statement-breakpoint
-- Créneaux déjà pris chez une salle partenaire (réservations prises au comptoir, par exemple).
-- Ils empêchent Master Break de proposer une table déjà retenue ailleurs.
CREATE TABLE IF NOT EXISTS "mb"."creneaux_externes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL REFERENCES "mb"."venues"("id") ON DELETE CASCADE,
	"table_id" uuid NOT NULL REFERENCES "mb"."venue_tables"("id") ON DELETE CASCADE,
	"reference" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "creneaux_externes_ref_idx" ON "mb"."creneaux_externes" ("venue_id","reference");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creneaux_externes_table_idx" ON "mb"."creneaux_externes" ("table_id","starts_at");
