CREATE TABLE IF NOT EXISTS "mb"."popups" (
  "id" uuid PRIMARY KEY NOT NULL,
  "titre" text NOT NULL,
  "texte" text DEFAULT '' NOT NULL,
  "image" text DEFAULT '' NOT NULL,
  "bouton1_label" text DEFAULT '' NOT NULL,
  "bouton1_url" text DEFAULT '' NOT NULL,
  "bouton2_label" text DEFAULT '' NOT NULL,
  "bouton2_url" text DEFAULT '' NOT NULL,
  "pages" text DEFAULT 'tous' NOT NULL,
  "par_jour" integer DEFAULT 1 NOT NULL,
  "debut" timestamp with time zone DEFAULT now() NOT NULL,
  "fin" timestamp with time zone NOT NULL,
  "actif" boolean DEFAULT true NOT NULL,
  "priorite" integer DEFAULT 0 NOT NULL,
  "event_id" uuid REFERENCES "mb"."events"("id") ON DELETE SET NULL,
  "vues" integer DEFAULT 0 NOT NULL,
  "clics" integer DEFAULT 0 NOT NULL,
  "fermetures" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popups_fenetre_idx" ON "mb"."popups" ("actif", "debut", "fin");
