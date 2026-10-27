-- Position GPS des salles, et présences des joueurs.
--
-- Une présence dit où quelqu'un se trouve en ce moment : comme une
-- invitation, elle n'est pas publique. Le joueur voit les siennes ;
-- l'application (service_role) calcule le nombre de présents par salle.

ALTER TABLE "mb"."venues" ADD COLUMN IF NOT EXISTS "latitude" double precision;--> statement-breakpoint
ALTER TABLE "mb"."venues" ADD COLUMN IF NOT EXISTS "longitude" double precision;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mb"."presences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"distance_m" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mb"."presences" ADD CONSTRAINT "presences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mb"."presences" ADD CONSTRAINT "presences_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "presences_venue_idx" ON "mb"."presences" USING btree ("venue_id","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "presences_user_idx" ON "mb"."presences" USING btree ("user_id");--> statement-breakpoint
alter table mb.presences enable row level security;--> statement-breakpoint
drop policy if exists presences_read_own on mb.presences;--> statement-breakpoint
create policy presences_read_own on mb.presences for select using (user_id = mb.current_user_id());--> statement-breakpoint
do $$
begin
  revoke all on mb.presences from public;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.presences to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.presences to authenticated;
  end if;
end;
$$;
