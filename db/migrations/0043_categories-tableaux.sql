ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_parent_id_tournaments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "mb"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournaments_parent_idx" ON "mb"."tournaments" USING btree ("parent_id");
