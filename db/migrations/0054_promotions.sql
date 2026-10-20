CREATE TABLE IF NOT EXISTS "mb"."tarifs_promo" (
  "formule" text PRIMARY KEY NOT NULL,
  "nom" text NOT NULL,
  "prix" integer NOT NULL,
  "jours" integer NOT NULL,
  "actif" boolean DEFAULT true NOT NULL
);--> statement-breakpoint
INSERT INTO "mb"."tarifs_promo" ("formule", "nom", "prix", "jours") VALUES
  ('sponsorise', 'Sponsorisé dans la liste', 5000, 7),
  ('une', 'À la une', 10000, 3),
  ('popup', 'Pop-up', 10000, 3),
  ('notification', 'Notification ciblée', 15000, 1),
  ('pack', 'Pack complet', 30000, 7)
ON CONFLICT ("formule") DO NOTHING;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mb"."promotions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "mb"."events"("id") ON DELETE CASCADE,
  "demandeur_id" uuid REFERENCES "mb"."users"("id") ON DELETE SET NULL,
  "formule" text NOT NULL,
  "prix" integer NOT NULL,
  "jours" integer NOT NULL,
  "status" text DEFAULT 'demande' NOT NULL,
  "source" text DEFAULT 'paiement' NOT NULL,
  "debut_souhaite" timestamp with time zone,
  "debut" timestamp with time zone,
  "fin" timestamp with time zone,
  "popup_id" uuid REFERENCES "mb"."popups"("id") ON DELETE SET NULL,
  "notif_envoyee" boolean DEFAULT false NOT NULL,
  "rappel_envoye" boolean DEFAULT false NOT NULL,
  "motif_refus" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotions_fenetre_idx" ON "mb"."promotions" ("status", "debut", "fin");
