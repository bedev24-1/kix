-- Le partenaire d'un direct, affiché sur la barre de score (« Présenté par … »).
ALTER TABLE "mb"."streams" ADD COLUMN IF NOT EXISTS "sponsor" text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- La barre de score déjà incrustée dans la vidéo par OBS : l'app n'en ajoute pas une seconde.
ALTER TABLE "mb"."streams" ADD COLUMN IF NOT EXISTS "barre_video" boolean DEFAULT false NOT NULL;
