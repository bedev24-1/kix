-- Rappels de tournoi : J-2, J-1, le jour J et une heure avant.
--
-- Une ligne par joueur et par rappel envoyé, pour ne jamais l'envoyer deux
-- fois. Rien de public : seule l'application (service_role) y touche.

CREATE TABLE IF NOT EXISTS "mb"."rappels_tournoi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mb"."rappels_tournoi" ADD CONSTRAINT "rappels_tournoi_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "mb"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mb"."rappels_tournoi" ADD CONSTRAINT "rappels_tournoi_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rappels_tournoi_idx" ON "mb"."rappels_tournoi" USING btree ("tournament_id","user_id","cle");--> statement-breakpoint
ALTER TABLE "mb"."rappels_tournoi" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
do $$
begin
  revoke all on mb.rappels_tournoi from public;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.rappels_tournoi to service_role;
  end if;
end;
$$;
