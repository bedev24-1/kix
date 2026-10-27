ALTER TABLE "mb"."matches" ADD COLUMN IF NOT EXISTS "etat8" jsonb DEFAULT '{}'::jsonb NOT NULL;
