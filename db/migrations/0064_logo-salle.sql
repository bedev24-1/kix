-- Le logo de la salle, affiché en petit sur ses directs.
ALTER TABLE "mb"."venues" ADD COLUMN IF NOT EXISTS "logo" text DEFAULT '' NOT NULL;
