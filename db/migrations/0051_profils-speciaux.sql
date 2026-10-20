CREATE TABLE IF NOT EXISTS "mb"."profils_speciaux" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "mb"."users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "status" text DEFAULT 'demande' NOT NULL,
  "actif_jusqu" timestamp with time zone,
  "source" text DEFAULT 'paiement' NOT NULL,
  "motivation" text DEFAULT '' NOT NULL,
  "decide_par" uuid REFERENCES "mb"."users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profils_speciaux_user_type_idx" ON "mb"."profils_speciaux" ("user_id", "type");
