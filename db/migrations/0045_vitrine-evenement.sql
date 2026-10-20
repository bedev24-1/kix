ALTER TABLE "mb"."events" ADD COLUMN IF NOT EXISTS "vitrine" jsonb DEFAULT '{}'::jsonb NOT NULL;
