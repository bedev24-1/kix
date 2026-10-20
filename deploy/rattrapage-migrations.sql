-- Rattrapage des migrations de kix (schéma mb).
-- Généré depuis db/migrations : rejoue chaque instruction en sautant ce qui
-- existe déjà, puis enregistre les migrations comme appliquées pour Drizzle.
-- À lancer avec le compte supabase_admin (propriétaire d'une partie des tables).
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA IF NOT EXISTS mb;
-- 0000_schema_mb
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE SCHEMA IF NOT EXISTS "mb";$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE SCHEMA IF NOT EXISTS "mb";$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"day" text NOT NULL,
	"hours" text DEFAULT '' NOT NULL,
	"checkin" text DEFAULT '' NOT NULL,
	"venue_id" uuid,
	"address" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"image" text NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"attendees" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."events" (
	"id" uuid PRIMARY KEY DEFAULT $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'system' NOT NULL,
	"href" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."notifications" (
	"id" uuid PRIMARY KEY D$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."order_items" (
	"id" uuid PRIMARY KEY DEF$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"total" integer NOT NULL,
	"method" text DEFAULT 'momo' NOT NULL,
	"fulfillment" text DEFAULT 'pickup' NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."orders" (
	"id" uuid PRIMARY KEY DEFAULT $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tokens" integer NOT NULL,
	"price" integer NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"hint" text DEFAULT '' NOT NULL,
	"badge" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."packs" (
	"id" uuid PRIMARY KEY DEFAULT g$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"image" text NOT NULL,
	"category" text DEFAULT 'vapes' NOT NULL,
	"badge_label" text,
	"badge_tone" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."products" (
	"id" uuid PRIMARY KEY DEFAUL$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pack_id" uuid,
	"venue_id" uuid,
	"tokens" integer NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_reference_unique" UNIQUE("reference")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."purchases" (
	"id" uuid PRIMARY KEY DEFAU$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"ref_id" uuid NOT NULL,
	"code" text NOT NULL,
	"user_id" uuid,
	"venue_id" uuid,
	"manager_id" uuid,
	"method" text DEFAULT 'qr' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."scans" (
	"id" uuid PRIMARY KEY DEFAULT g$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."sessions" (
	"id" uuid PRIMARY KEY DEFAUL$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'valid' NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."tickets" (
	"id" uuid PRIMARY KEY DEFAULT$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"purchase_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"table_number" integer,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."tokens" (
	"id" uuid PRIMARY KEY DEFAULT $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text,
	"avatar" text,
	"role" text DEFAULT 'client' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"venue_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."users" (
	"id" uuid PRIMARY KEY DEFAULT g$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"city" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"tables" integer DEFAULT 6 NOT NULL,
	"free_tables" integer DEFAULT 0 NOT NULL,
	"token_price" integer DEFAULT 400 NOT NULL,
	"distance_km" real DEFAULT 0 NOT NULL,
	"image" text DEFAULT '/img/hall-dark.jpg' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."venues" (
	"id" uuid PRIMARY KEY DEFAULT $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."events" ADD CONSTRAINT "events_venue_id_ve$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."notifications" ADD CONSTRAINT "notificatio$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "mb"."orders"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_o$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "mb"."products"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_p$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."orders" ADD CONSTRAINT "orders_user_id_use$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."orders" ADD CONSTRAINT "orders_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."orders" ADD CONSTRAINT "orders_venue_id_ve$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."purchases" ADD CONSTRAINT "purchases_user_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."purchases" ADD CONSTRAINT "purchases_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "mb"."packs"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."purchases" ADD CONSTRAINT "purchases_pack_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."purchases" ADD CONSTRAINT "purchases_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."purchases" ADD CONSTRAINT "purchases_venue$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."scans" ADD CONSTRAINT "scans_user_id_users$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."scans" ADD CONSTRAINT "scans_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."scans" ADD CONSTRAINT "scans_venue_id_venu$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."scans" ADD CONSTRAINT "scans_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."scans" ADD CONSTRAINT "scans_manager_id_us$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."sessions" ADD CONSTRAINT "sessions_user_id$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "mb"."events"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tickets" ADD CONSTRAINT "tickets_event_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tickets" ADD CONSTRAINT "tickets_user_id_u$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tokens" ADD CONSTRAINT "tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tokens" ADD CONSTRAINT "tokens_user_id_use$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tokens" ADD CONSTRAINT "tokens_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tokens" ADD CONSTRAINT "tokens_venue_id_ve$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tokens" ADD CONSTRAINT "tokens_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "mb"."purchases"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tokens" ADD CONSTRAINT "tokens_purchase_id$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."users" ADD CONSTRAINT "users_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."users" ADD CONSTRAINT "users_venue_id_venu$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "notifications_user_idx" ON "mb"."notifications" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "notifications_user_idx" ON "mb"."notifications$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "orders_user_idx" ON "mb"."orders" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "orders_user_idx" ON "mb"."orders" USING btree $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "purchases_user_idx" ON "mb"."purchases" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "purchases_user_idx" ON "mb"."purchases" USING $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "scans_venue_idx" ON "mb"."scans" USING btree ("venue_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "scans_venue_idx" ON "mb"."scans" USING btree ($mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "scans_created_idx" ON "mb"."scans" USING btree ("created_at");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "scans_created_idx" ON "mb"."scans" USING btree$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "sessions_user_idx" ON "mb"."sessions" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "sessions_user_idx" ON "mb"."sessions" USING bt$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "tickets_user_idx" ON "mb"."tickets" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "tickets_user_idx" ON "mb"."tickets" USING btre$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "tokens_user_idx" ON "mb"."tokens" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "tokens_user_idx" ON "mb"."tokens" USING btree $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "tokens_code_idx" ON "mb"."tokens" USING btree ("code");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "tokens_code_idx" ON "mb"."tokens" USING btree $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE UNIQUE INDEX "users_phone_idx" ON "mb"."users" USING btree ("phone");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE UNIQUE INDEX "users_phone_idx" ON "mb"."users" USING $mbrattrapage$, 60); END $mbrattrapaged$;
-- 0001_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Identité de l'appelant, lue dans le JWT transmis par PostgREST.
-- Équivalent de `auth.uid()`, sans dépendre du schéma `auth`.
create or replace function mb.jwt_sub() returns uuid
  language plpgsql stable
  set search_path = mb, public
as $$
declare raw text;
begin
  raw := nullif(current_setting('request.jwt.claim.sub', true), '');
  if raw is null then
    raw := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
  end if;
  return nullif(raw, '')::uuid;
exception when others then
  return null;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Identité de l'appelant, lue dans le JWT transmis par Post$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Ligne `mb.users` correspondant au compte GoTrue courant.
create or replace function mb.current_user_id() returns uuid
  language sql stable security definer
  set search_path = mb, public
as $$
  select u.id from mb.users u where u.auth_id = mb.jwt_sub();
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Ligne `mb.users` correspondant au compte GoTrue courant.
$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create or replace function mb.current_role() returns text
  language sql stable security definer
  set search_path = mb, public
as $$
  select u.role from mb.users u where u.auth_id = mb.jwt_sub();
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create or replace function mb.current_role() returns text
  $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Salle dont l'appelant est le gérant (null sinon).
create or replace function mb.current_venue_id() returns uuid
  language sql stable security definer
  set search_path = mb, public
as $$
  select u.venue_id from mb.users u
   where u.auth_id = mb.jwt_sub() and u.role in ('manager', 'admin');
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Salle dont l'appelant est le gérant (null sinon).
create $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS active sur toutes les tables : sans politique, plus rien ne passe par
-- l'API. `force` n'est volontairement pas utilisé — le rôle propriétaire est
-- celui des Server Actions, et le lui appliquer casserait l'app si la connexion
-- se faisait un jour sans `bypassrls`.
do $$
declare t text;
begin
  foreach t in array array[
    'venues','users','packs','purchases','tokens','products','orders',
    'order_items','events','tickets','scans','notifications','sessions'
  ] loop
    execute format('alter table mb.%I enable row level security', t);
  end loop;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS active sur toutes les tables : sans politique, plus r$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Catalogue public : lisible par tous, modifiable seulement côté serveur.
do $$
declare t text;
begin
  foreach t in array array['venues','packs','products','events'] loop
    execute format('drop policy if exists %I on mb.%I', t || '_read_active', t);
    execute format(
      'create policy %I on mb.%I for select using (active)',
      t || '_read_active', t
    );
  end loop;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Catalogue public : lisible par tous, modifiable seulement$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Données personnelles : chacun ne voit que les siennes.
do $$
declare t text;
begin
  foreach t in array array['purchases','tokens','orders','tickets','notifications'] loop
    execute format('drop policy if exists %I on mb.%I', t || '_read_own', t);
    execute format(
      'create policy %I on mb.%I for select using (user_id = mb.current_user_id())',
      t || '_read_own', t
    );
  end loop;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Données personnelles : chacun ne voit que les siennes.
do$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists users_read_self on mb.users;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists users_read_self on mb.users;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy users_read_self on mb.users for select
  using (auth_id = mb.jwt_sub() or mb.current_role() = 'admin');$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy users_read_self on mb.users for select
  using$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Profil modifiable par son propriétaire ; le rôle, les points et la salle
-- restent hors de portée (colonnes verrouillées par le WITH CHECK).
drop policy if exists users_update_self on mb.users;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Profil modifiable par son propriétaire ; le rôle, les poi$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy users_update_self on mb.users for update
  using (auth_id = mb.jwt_sub())
  with check (
    auth_id = mb.jwt_sub()
    and role = (select u.role from mb.users u where u.auth_id = mb.jwt_sub())
    and points = (select u.points from mb.users u where u.auth_id = mb.jwt_sub())
    and venue_id is not distinct from (select u.venue_id from mb.users u where u.auth_id = mb.jwt_sub())
  );$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy users_update_self on mb.users for update
  usi$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Notifications : marquer comme lu, rien d'autre.
drop policy if exists notifications_update_own on mb.notifications;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Notifications : marquer comme lu, rien d'autre.
drop poli$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy notifications_update_own on mb.notifications for update
  using (user_id = mb.current_user_id())
  with check (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy notifications_update_own on mb.notifications f$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Lignes de commande : visibles via la commande parente.
drop policy if exists order_items_read_own on mb.order_items;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Lignes de commande : visibles via la commande parente.
dr$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy order_items_read_own on mb.order_items for select
  using (exists (
    select 1 from mb.orders o
     where o.id = order_items.order_id and o.user_id = mb.current_user_id()
  ));$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy order_items_read_own on mb.order_items for sel$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Passages : le joueur voit les siens, le gérant ceux de sa salle.
drop policy if exists scans_read on mb.scans;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Passages : le joueur voit les siens, le gérant ceux de sa$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy scans_read on mb.scans for select
  using (
    user_id = mb.current_user_id()
    or venue_id = mb.current_venue_id()
    or mb.current_role() = 'admin'
  );$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy scans_read on mb.scans for select
  using (
  $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Le gérant lit les jetons de sa salle pour valider un QR au comptoir.
drop policy if exists tokens_read_venue on mb.tokens;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Le gérant lit les jetons de sa salle pour valider un QR a$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy tokens_read_venue on mb.tokens for select
  using (venue_id = mb.current_venue_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy tokens_read_venue on mb.tokens for select
  us$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Droits. `anon` ne voit que le catalogue, `authenticated` y ajoute ses propres
-- lignes, `service_role` garde tout. Rien pour `public`.
do $$
begin
  execute 'revoke all on all tables in schema mb from public';
  execute 'revoke all on schema mb from public';

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema mb to service_role;
    grant all on all tables in schema mb to service_role;
    grant all on all sequences in schema mb to service_role;
    grant execute on all functions in schema mb to service_role;
    alter default privileges in schema mb grant all on tables to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema mb to anon;
    grant select on mb.venues, mb.packs, mb.products, mb.events to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema mb to authenticated;
    grant select on mb.venues, mb.packs, mb.products, mb.events to authenticated;
    grant select on mb.purchases, mb.tokens, mb.orders, mb.order_items,
                   mb.tickets, mb.scans to authenticated;
    grant select, update on mb.users, mb.notifications to authenticated;
    grant execute on function mb.jwt_sub(), mb.current_user_id(),
                              mb.current_role(), mb.current_venue_id() to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Droits. `anon` ne voit que le catalogue, `authenticated` $mbrattrapage$, 60); END $mbrattrapaged$;
-- 0002_payments
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"kind" text NOT NULL,
	"target_id" uuid,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"phone" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"detail" jsonb,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."payments" (
	"id" uuid PRIMARY KEY DEFAUL$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."orders" ALTER COLUMN "status" SET DEFAULT 'pending';$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."orders" ALTER COLUMN "status" SET DEFAULT $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."purchases" ALTER COLUMN "status" SET DEFAULT 'pending';$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."purchases" ALTER COLUMN "status" SET DEFAU$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."orders" ADD COLUMN "reference" text;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."orders" ADD COLUMN "reference" text;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tickets" ADD COLUMN "reference" text;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tickets" ADD COLUMN "reference" text;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."payments" ADD CONSTRAINT "payments_user_id$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "payments_user_idx" ON "mb"."payments" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "payments_user_idx" ON "mb"."payments" USING bt$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "payments_status_idx" ON "mb"."payments" USING btree ("status");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "payments_status_idx" ON "mb"."payments" USING $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."orders" ADD CONSTRAINT "orders_reference_unique" UNIQUE("reference");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."orders" ADD CONSTRAINT "orders_reference_u$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tickets" ADD CONSTRAINT "tickets_reference_unique" UNIQUE("reference");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tickets" ADD CONSTRAINT "tickets_reference$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0003_payments_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS de `mb.payments`, dans la continuité de 0001_rls.sql : chacun ne voit que
-- ses propres paiements, personne n'en écrit depuis l'API (seuls le serveur et
-- le webhook, qui passent par le rôle propriétaire, créent et confirment).

alter table mb.payments enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS de `mb.payments`, dans la continuité de 0001_rls.sql $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists payments_read_own on mb.payments;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists payments_read_own on mb.payments;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy payments_read_own on mb.payments for select
  using (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy payments_read_own on mb.payments for select
  $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.payments from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.payments to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.payments to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.payments from public;

  if e$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0004_venue_os
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"table_id" uuid,
	"user_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"minutes" integer DEFAULT 60 NOT NULL,
	"players" integer DEFAULT 2 NOT NULL,
	"deposit" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"reference" text,
	"seated_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_reference_unique" UNIQUE("reference")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."reservations" (
	"id" uuid PRIMARY KEY DE$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."venue_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kind" text DEFAULT 'pool' NOT NULL,
	"hourly_rate" integer DEFAULT 0 NOT NULL,
	"deposit" integer DEFAULT 1000 NOT NULL,
	"status" text DEFAULT 'free' NOT NULL,
	"seats" integer DEFAULT 4 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."venue_tables" (
	"id" uuid PRIMARY KEY DE$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."reservations" ADD CONSTRAINT "reservations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."reservations" ADD CONSTRAINT "reservations$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."reservations" ADD CONSTRAINT "reservations_table_id_venue_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "mb"."venue_tables"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."reservations" ADD CONSTRAINT "reservations$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."reservations" ADD CONSTRAINT "reservations$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."venue_tables" ADD CONSTRAINT "venue_tables_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."venue_tables" ADD CONSTRAINT "venue_tables$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "reservations_venue_idx" ON "mb"."reservations" USING btree ("venue_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "reservations_venue_idx" ON "mb"."reservations"$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "reservations_user_idx" ON "mb"."reservations" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "reservations_user_idx" ON "mb"."reservations" $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "reservations_starts_idx" ON "mb"."reservations" USING btree ("starts_at");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "reservations_starts_idx" ON "mb"."reservations$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "venue_tables_venue_idx" ON "mb"."venue_tables" USING btree ("venue_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "venue_tables_venue_idx" ON "mb"."venue_tables"$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0005_venue_os_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS de Venue OS, dans la continuité de 0001_rls.sql.
--   · le plan de salle est public : un joueur doit voir ce qui est libre ;
--   · une réservation n'est visible que de son auteur et du gérant de la salle.

alter table mb.venue_tables enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS de Venue OS, dans la continuité de 0001_rls.sql.
--  $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.reservations enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.reservations enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists venue_tables_read on mb.venue_tables;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists venue_tables_read on mb.venue_tables;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy venue_tables_read on mb.venue_tables for select using (active);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy venue_tables_read on mb.venue_tables for selec$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists reservations_read on mb.reservations;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists reservations_read on mb.reservations;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy reservations_read on mb.reservations for select
  using (
    user_id = mb.current_user_id()
    or venue_id = mb.current_venue_id()
    or mb.current_role() = 'admin'
  );$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy reservations_read on mb.reservations for selec$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.venue_tables, mb.reservations from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.venue_tables, mb.reservations to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.venue_tables to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.venue_tables, mb.reservations to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.venue_tables, mb.reservations$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0006_live
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."match_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid,
	"kind" text NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL,
	"score_a" integer DEFAULT 0 NOT NULL,
	"score_b" integer DEFAULT 0 NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."match_events" (
	"id" uuid PRIMARY KEY DE$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"table_id" uuid,
	"event_id" uuid,
	"kind" text DEFAULT '8-ball' NOT NULL,
	"target" integer DEFAULT 5 NOT NULL,
	"player_a_id" uuid NOT NULL,
	"player_b_id" uuid NOT NULL,
	"score_a" integer DEFAULT 0 NOT NULL,
	"score_b" integer DEFAULT 0 NOT NULL,
	"turn_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"winner_id" uuid,
	"stake" integer DEFAULT 0 NOT NULL,
	"label" text DEFAULT 'Amical' NOT NULL,
	"starts_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."matches" (
	"id" uuid PRIMARY KEY DEFAULT$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "mb"."matches"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_events" ADD CONSTRAINT "match_events$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_events" ADD CONSTRAINT "match_events_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_events" ADD CONSTRAINT "match_events$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_venue_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_table_id_venue_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "mb"."venue_tables"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_table_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "mb"."events"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_event_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_player_a_id_users_id_fk" FOREIGN KEY ("player_a_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_player_a_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_player_b_id_users_id_fk" FOREIGN KEY ("player_b_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_player_b_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_turn_id_users_id_fk" FOREIGN KEY ("turn_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_turn_id_u$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_winner_id$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."matches" ADD CONSTRAINT "matches_created_b$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "match_events_match_idx" ON "mb"."match_events" USING btree ("match_id","seq");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "match_events_match_idx" ON "mb"."match_events"$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "matches_venue_idx" ON "mb"."matches" USING btree ("venue_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "matches_venue_idx" ON "mb"."matches" USING btr$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "matches_status_idx" ON "mb"."matches" USING btree ("status");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "matches_status_idx" ON "mb"."matches" USING bt$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "matches_players_idx" ON "mb"."matches" USING btree ("player_a_id","player_b_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "matches_players_idx" ON "mb"."matches" USING b$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0007_live_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS de Master Break Live.
--
-- Un score en direct est public par nature : c'est ce qu'on affiche sur l'écran
-- de la salle et ce que suivent les joueurs. Les deux tables sont donc en
-- lecture ouverte ; l'écriture reste au serveur, seul le gérant marque les
-- points depuis sa console.

alter table mb.matches enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS de Master Break Live.
--
-- Un score en direct est pu$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.match_events enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.match_events enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists matches_read on mb.matches;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists matches_read on mb.matches;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy matches_read on mb.matches for select using (true);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy matches_read on mb.matches for select using (t$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists match_events_read on mb.match_events;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists match_events_read on mb.match_events;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy match_events_read on mb.match_events for select using (true);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy match_events_read on mb.match_events for selec$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.matches, mb.match_events from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.matches, mb.match_events to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.matches, mb.match_events to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.matches, mb.match_events to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.matches, mb.match_events from$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0008_officials
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."match_officials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid,
	"event_id" uuid,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'referee' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."match_officials" (
	"id" uuid PRIMARY KEY$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_events" ADD COLUMN "by_id" uuid;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_events" ADD COLUMN "by_id" uuid;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."venues" ADD COLUMN "self_scoring" boolean DEFAULT false NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."venues" ADD COLUMN "self_scoring" boolean $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_officials_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "mb"."matches"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_off$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_officials_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "mb"."events"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_off$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_officials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_off$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_officials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_officials" ADD CONSTRAINT "match_off$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "match_officials_match_idx" ON "mb"."match_officials" USING btree ("match_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "match_officials_match_idx" ON "mb"."match_offi$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "match_officials_event_idx" ON "mb"."match_officials" USING btree ("event_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "match_officials_event_idx" ON "mb"."match_offi$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "match_officials_user_idx" ON "mb"."match_officials" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "match_officials_user_idx" ON "mb"."match_offic$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."match_events" ADD CONSTRAINT "match_events_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."match_events" ADD CONSTRAINT "match_events$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0009_officials_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des habilitations d'arbitrage.
--
-- Qui tient la feuille de match est une information publique : les joueurs
-- doivent pouvoir vérifier qui a saisi leur score. L'écriture reste au serveur.

alter table mb.match_officials enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des habilitations d'arbitrage.
--
-- Qui tient la feu$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists match_officials_read on mb.match_officials;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists match_officials_read on mb.match_offic$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy match_officials_read on mb.match_officials for select using (true);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy match_officials_read on mb.match_officials for$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.match_officials from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.match_officials to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.match_officials to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.match_officials to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.match_officials from public;
$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0010_streams
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."stream_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stream_passes_reference_unique" UNIQUE("reference")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."stream_passes" (
	"id" uuid PRIMARY KEY D$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"match_id" uuid,
	"event_id" uuid,
	"title" text NOT NULL,
	"level" text DEFAULT 'phone' NOT NULL,
	"access" text DEFAULT 'free' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"stream_key" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"viewers" integer DEFAULT 0 NOT NULL,
	"peak_viewers" integer DEFAULT 0 NOT NULL,
	"replay_url" text,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streams_path_unique" UNIQUE("path"),
	CONSTRAINT "streams_stream_key_unique" UNIQUE("stream_key")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."streams" (
	"id" uuid PRIMARY KEY DEFAULT$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."users" ADD COLUMN "member_until" timestamp with time zone;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."users" ADD COLUMN "member_until" timestamp$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD CONSTRAINT "stream_passes_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "mb"."streams"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD CONSTRAINT "stream_pass$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD CONSTRAINT "stream_passes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD CONSTRAINT "stream_pass$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_venue_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "mb"."matches"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_match_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "mb"."events"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_event_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."streams" ADD CONSTRAINT "streams_created_b$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE UNIQUE INDEX "stream_passes_unique" ON "mb"."stream_passes" USING btree ("stream_id","user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE UNIQUE INDEX "stream_passes_unique" ON "mb"."stream_p$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "streams_venue_idx" ON "mb"."streams" USING btree ("venue_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "streams_venue_idx" ON "mb"."streams" USING btr$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "streams_status_idx" ON "mb"."streams" USING btree ("status");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "streams_status_idx" ON "mb"."streams" USING bt$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "streams_match_idx" ON "mb"."streams" USING btree ("match_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "streams_match_idx" ON "mb"."streams" USING btr$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0011_streams_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des directs.
--
-- La fiche d'un direct est publique — on doit pouvoir annoncer ce qui passe ce
-- soir — mais `stream_key` est le secret d'ingestion : il ne sort jamais par
-- l'API. D'où une vue qui l'omet, et aucun droit sur la table elle-même pour
-- `anon` et `authenticated`.

alter table mb.streams enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des directs.
--
-- La fiche d'un direct est publique $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.stream_passes enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.stream_passes enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists streams_read on mb.streams;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists streams_read on mb.streams;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy streams_read on mb.streams for select using (true);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy streams_read on mb.streams for select using (t$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists stream_passes_read_own on mb.stream_passes;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists stream_passes_read_own on mb.stream_pa$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy stream_passes_read_own on mb.stream_passes for select
  using (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy stream_passes_read_own on mb.stream_passes for$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Tout sauf la clé d'ingestion.
create or replace view mb.public_streams as
  select id, venue_id, match_id, event_id, title, level, access, price, path,
         status, started_at, ended_at, viewers, peak_viewers, replay_url, created_at
    from mb.streams;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Tout sauf la clé d'ingestion.
create or replace view mb.p$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter view mb.public_streams set (security_invoker = true);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter view mb.public_streams set (security_invoker = true);$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.streams, mb.stream_passes from public;
  revoke all on mb.public_streams from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.streams, mb.stream_passes to service_role;
    grant select on mb.public_streams to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.public_streams to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.public_streams to authenticated;
    grant select on mb.stream_passes to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.streams, mb.stream_passes fro$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0012_stream_discipline
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."streams" ADD COLUMN "discipline" text DEFAULT '8-ball' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."streams" ADD COLUMN "discipline" text DEFA$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0013_stream_poster
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."streams" ADD COLUMN "poster" text;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."streams" ADD COLUMN "poster" text;$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0014_screens
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"name" text DEFAULT '' NOT NULL,
	"stream_id" uuid,
	"pairing_code" text,
	"pairing_expires_at" timestamp with time zone,
	"token_hash" text NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "screens_pairing_code_unique" UNIQUE("pairing_code"),
	CONSTRAINT "screens_token_hash_unique" UNIQUE("token_hash")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."screens" (
	"id" uuid PRIMARY KEY DEFAULT$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."screens" ADD CONSTRAINT "screens_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."screens" ADD CONSTRAINT "screens_venue_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."screens" ADD CONSTRAINT "screens_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "mb"."streams"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."screens" ADD CONSTRAINT "screens_stream_id$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "screens_venue_idx" ON "mb"."screens" USING btree ("venue_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "screens_venue_idx" ON "mb"."screens" USING btr$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0015_screens_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des écrans de salle.
--
-- Une ligne d'écran porte deux secrets : `token_hash`, qui vaut identité pour
-- le téléviseur, et `pairing_code`, qui vaut droit d'adoption tant qu'il n'a
-- pas servi. Ni l'un ni l'autre ne doit pouvoir être lu — un code lisible
-- laisserait n'importe quel compte adopter l'écran d'une autre salle avant
-- son gérant.
--
-- Aucun droit n'est donc accordé à `anon` ni à `authenticated` sur la table :
-- tout passe par l'application, qui vérifie le rôle et la salle.

alter table mb.screens enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des écrans de salle.
--
-- Une ligne d'écran porte de$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.screens from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.screens to service_role;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.screens from public;

  if ex$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0016_token_unit_price
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tokens" ADD COLUMN "unit_price" integer;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tokens" ADD COLUMN "unit_price" integer;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Reprise de l'existant : les jetons déjà vendus portent la valeur de leur
-- achat. Le reste — jeu de démonstration, jetons offerts à la main — garde
-- `null`, et le scan retombera sur le tarif de la salle.
--
-- La division entière perd le reste : un pack à 1000 F pour trois jetons
-- donnerait 333 × 3 = 999 F. On rend le franc manquant aux premiers jetons,
-- sans quoi la recette d'une soirée s'écarte lentement de la caisse.
-- On divise par le nombre de jetons réellement rattachés, et non par le
-- `tokens` déclaré sur l'achat : si les deux divergent — reprise de données,
-- jeton offert après coup — c'est le compte réel qui fait foi, et la somme des
-- valeurs retombe toujours sur ce qui a été payé.
with compte as (
  select purchase_id, count(*)::int as total
    from mb.tokens
   where purchase_id is not null
   group by purchase_id
),
valeur as (
  select t.id,
         p.amount / c.total as base,
         case
           when row_number() over (partition by t.purchase_id order by t.created_at, t.id)
                <= p.amount % c.total
           then 1 else 0
         end as reste
    from mb.tokens t
    join mb.purchases p on p.id = t.purchase_id
    join compte c on c.purchase_id = t.purchase_id
   where c.total > 0
)
update mb.tokens t
   set unit_price = v.base + v.reste
  from valeur v
 where v.id = t.id;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Reprise de l'existant : les jetons déjà vendus portent la$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0017_marketplace
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "seller_id" uuid;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "seller_id" uuid;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "commission" integer DEFAULT 0 NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "commission" integ$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."products" ADD COLUMN "seller_id" uuid;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."products" ADD COLUMN "seller_id" uuid;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_s$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."products" ADD CONSTRAINT "products_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."products" ADD CONSTRAINT "products_seller_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Reprise : les lignes déjà vendues portent la commission au taux en vigueur.
-- Elles restent sans vendeur — c'étaient des articles de la maison, et rien
-- n'est dû à personne.
update mb.order_items set commission = round(unit_price * qty * 0.1) where commission = 0;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Reprise : les lignes déjà vendues portent la commission a$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0018_marketplace_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS de la place de marché.
--
-- `products` reste lisible par tous — c'est un catalogue. Mais `seller_id`
-- désigne une personne, et `order_items` porte ce qu'on doit à qui : ni l'un
-- ni l'autre ne s'ouvre à `anon`. Le vendeur passe par l'application, qui
-- vérifie que la ligne est bien la sienne.

alter table mb.order_items enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS de la place de marché.
--
-- `products` reste lisible$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.order_items from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.order_items to service_role;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.order_items from public;

  i$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0019_cours
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"coach_id" uuid,
	"coach_name" text DEFAULT '' NOT NULL,
	"venue_id" uuid,
	"level" text DEFAULT 'debutant' NOT NULL,
	"format" text DEFAULT 'forfait' NOT NULL,
	"sessions" integer DEFAULT 1 NOT NULL,
	"schedule" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"image" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"capacity" integer DEFAULT 10 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."courses" (
	"id" uuid PRIMARY KEY DEFAULT$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_reference_unique" UNIQUE("reference")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."enrollments" (
	"id" uuid PRIMARY KEY DEF$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."courses" ADD CONSTRAINT "courses_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."courses" ADD CONSTRAINT "courses_coach_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."courses" ADD CONSTRAINT "courses_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."courses" ADD CONSTRAINT "courses_venue_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "mb"."courses"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."enrollments" ADD CONSTRAINT "enrollments_c$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."enrollments" ADD CONSTRAINT "enrollments_u$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "enrollments_course_idx" ON "mb"."enrollments" USING btree ("course_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "enrollments_course_idx" ON "mb"."enrollments" $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "enrollments_user_idx" ON "mb"."enrollments" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "enrollments_user_idx" ON "mb"."enrollments" US$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0020_cours_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des cours.
--
-- Le catalogue des cours est public — c'est une vitrine. Les inscriptions ne
-- le sont pas : elles nomment qui suit quoi et ce qu'il a payé.

alter table mb.courses enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des cours.
--
-- Le catalogue des cours est public — $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.enrollments enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.enrollments enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists courses_read on mb.courses;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists courses_read on mb.courses;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy courses_read on mb.courses for select using (active);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy courses_read on mb.courses for select using (a$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists enrollments_read_own on mb.enrollments;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists enrollments_read_own on mb.enrollments$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy enrollments_read_own on mb.enrollments for select
  using (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy enrollments_read_own on mb.enrollments for sel$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.courses, mb.enrollments from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.courses, mb.enrollments to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.courses to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.courses to authenticated;
    grant select on mb.enrollments to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.courses, mb.enrollments from $mbrattrapage$, 60); END $mbrattrapaged$;
-- 0021_tournois
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."tournament_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"slot" integer NOT NULL,
	"player_a_id" uuid,
	"player_b_id" uuid,
	"winner_id" uuid,
	"score_a" integer DEFAULT 0 NOT NULL,
	"score_b" integer DEFAULT 0 NOT NULL,
	"race_to" integer DEFAULT 4 NOT NULL,
	"match_id" uuid,
	"status" text DEFAULT 'attente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."tournament_matches" (
	"id" uuid PRIMARY $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."tournament_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"level" text DEFAULT 'intermediaire' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"seed" integer,
	"status" text DEFAULT 'candidat' NOT NULL,
	"fee" integer DEFAULT 0 NOT NULL,
	"payment" text DEFAULT 'impaye' NOT NULL,
	"reference" text,
	"reached_round" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_players_reference_unique" UNIQUE("reference")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."tournament_players" (
	"id" uuid PRIMARY $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"event_id" uuid,
	"venue_id" uuid,
	"organiser_id" uuid,
	"discipline" text DEFAULT '8-ball' NOT NULL,
	"size" integer DEFAULT 16 NOT NULL,
	"race_to" integer DEFAULT 4 NOT NULL,
	"entry_fee" integer DEFAULT 0 NOT NULL,
	"prize_pool" integer DEFAULT 0 NOT NULL,
	"prize_split" text DEFAULT '' NOT NULL,
	"rules" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '/img/table-rack.jpg' NOT NULL,
	"status" text DEFAULT 'brouillon' NOT NULL,
	"starts_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"winner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_slug_unique" UNIQUE("slug")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."tournaments" (
	"id" uuid PRIMARY KEY DEF$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "mb"."tournaments"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tourna$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tournament_matches_player_a_id_tournament_players_id_fk" FOREIGN KEY ("player_a_id") REFERENCES "mb"."tournament_players"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tourna$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tournament_matches_player_b_id_tournament_players_id_fk" FOREIGN KEY ("player_b_id") REFERENCES "mb"."tournament_players"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tourna$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tournament_matches_winner_id_tournament_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "mb"."tournament_players"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tourna$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tournament_matches_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "mb"."matches"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD CONSTRAINT "tourna$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_players" ADD CONSTRAINT "tournament_players_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "mb"."tournaments"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_players" ADD CONSTRAINT "tourna$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_players" ADD CONSTRAINT "tournament_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_players" ADD CONSTRAINT "tourna$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "mb"."events"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_e$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_v$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_organiser_id_users_id_fk" FOREIGN KEY ("organiser_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_o$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_w$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "tm_tournament_idx" ON "mb"."tournament_matches" USING btree ("tournament_id","round");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "tm_tournament_idx" ON "mb"."tournament_matches$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "tp_tournament_idx" ON "mb"."tournament_players" USING btree ("tournament_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "tp_tournament_idx" ON "mb"."tournament_players$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "tp_user_idx" ON "mb"."tournament_players" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "tp_user_idx" ON "mb"."tournament_players" USIN$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0022_tournois_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des tournois.
--
-- L'affiche est publique : un tournoi qu'on ne peut pas lire ne se remplit
-- pas. Le tableau aussi — c'est tout l'intérêt de le publier.
--
-- Les candidatures, non : elles portent un téléphone et un niveau déclaré.
-- Un joueur voit la sienne, personne d'autre. L'organisateur passe par
-- l'application, qui vérifie que le tournoi est bien le sien.

alter table mb.tournaments enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des tournois.
--
-- L'affiche est publique : un tourn$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.tournament_players enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.tournament_players enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.tournament_matches enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.tournament_matches enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists tournaments_read on mb.tournaments;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists tournaments_read on mb.tournaments;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy tournaments_read on mb.tournaments for select
  using (status <> 'brouillon');$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy tournaments_read on mb.tournaments for select
$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists tournament_matches_read on mb.tournament_matches;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists tournament_matches_read on mb.tourname$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy tournament_matches_read on mb.tournament_matches for select using (true);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy tournament_matches_read on mb.tournament_match$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists tournament_players_read_own on mb.tournament_players;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists tournament_players_read_own on mb.tour$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy tournament_players_read_own on mb.tournament_players for select
  using (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy tournament_players_read_own on mb.tournament_p$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.tournaments, mb.tournament_players, mb.tournament_matches from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.tournaments, mb.tournament_players, mb.tournament_matches to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.tournaments, mb.tournament_matches to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.tournaments, mb.tournament_matches to authenticated;
    grant select on mb.tournament_players to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.tournaments, mb.tournament_pl$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0023_abonnements
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."member_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"months" integer DEFAULT 1 NOT NULL,
	"price" integer NOT NULL,
	"perks" text DEFAULT '' NOT NULL,
	"hint" text DEFAULT '' NOT NULL,
	"badge" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "member_plans_slug_unique" UNIQUE("slug")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."member_plans" (
	"id" uuid PRIMARY KEY DE$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"months" integer DEFAULT 1 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_reference_unique" UNIQUE("reference")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."memberships" (
	"id" uuid PRIMARY KEY DEF$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."memberships" ADD CONSTRAINT "memberships_u$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."memberships" ADD CONSTRAINT "memberships_plan_id_member_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "mb"."member_plans"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."memberships" ADD CONSTRAINT "memberships_p$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "memberships_user_idx" ON "mb"."memberships" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "memberships_user_idx" ON "mb"."memberships" US$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0024_abonnements_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des abonnements.
--
-- Les formules sont un tarif public : les cacher empêcherait de les vendre.
-- Les abonnements, eux, disent qui paie quoi et jusqu'à quand — chacun ne
-- voit que le sien, et l'administration passe par l'application.

alter table mb.member_plans enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des abonnements.
--
-- Les formules sont un tarif pub$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.memberships enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.memberships enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists member_plans_read on mb.member_plans;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists member_plans_read on mb.member_plans;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy member_plans_read on mb.member_plans for select using (active);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy member_plans_read on mb.member_plans for selec$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists memberships_read_own on mb.memberships;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists memberships_read_own on mb.memberships$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy memberships_read_own on mb.memberships for select
  using (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy memberships_read_own on mb.memberships for sel$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.member_plans, mb.memberships from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.member_plans, mb.memberships to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.member_plans to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.member_plans, mb.memberships to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.member_plans, mb.memberships $mbrattrapage$, 60); END $mbrattrapaged$;
-- 0025_poules-amis-retraits
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" text DEFAULT 'attente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."friendships" (
	"id" uuid PRIMARY KEY DEF$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" text DEFAULT 'momo' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'demande' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"processed_by" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."payouts" (
	"id" uuid PRIMARY KEY DEFAULT$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."push_subscriptions" (
	"id" uuid PRIMARY $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD COLUMN "stage" text DEFAULT 'tableau' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD COLUMN "stage" tex$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD COLUMN "groupe" integer;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_matches" ADD COLUMN "groupe" in$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournament_players" ADD COLUMN "groupe" integer;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournament_players" ADD COLUMN "groupe" in$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "format" text DEFAULT 'direct' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "format" text DEFA$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "group_size" integer DEFAULT 4 NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "group_size" integ$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "qualifiers" integer DEFAULT 2 NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "qualifiers" integ$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."friendships" ADD CONSTRAINT "friendships_r$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."friendships" ADD CONSTRAINT "friendships_a$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."payouts" ADD CONSTRAINT "payouts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."payouts" ADD CONSTRAINT "payouts_venue_id_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."payouts" ADD CONSTRAINT "payouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE no action ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."payouts" ADD CONSTRAINT "payouts_user_id_u$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."payouts" ADD CONSTRAINT "payouts_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."payouts" ADD CONSTRAINT "payouts_processed$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ADD CONSTRAINT "push_s$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE UNIQUE INDEX "friendships_paire_idx" ON "mb"."friendships" USING btree ("requester_id","addressee_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE UNIQUE INDEX "friendships_paire_idx" ON "mb"."friends$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "friendships_addressee_idx" ON "mb"."friendships" USING btree ("addressee_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "friendships_addressee_idx" ON "mb"."friendship$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "payouts_venue_idx" ON "mb"."payouts" USING btree ("venue_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "payouts_venue_idx" ON "mb"."payouts" USING btr$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "payouts_user_idx" ON "mb"."payouts" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "payouts_user_idx" ON "mb"."payouts" USING btre$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "push_user_idx" ON "mb"."push_subscriptions" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "push_user_idx" ON "mb"."push_subscriptions" US$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0026_poules_amis_retraits_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des amis, des abonnements push et des retraits.
--
-- Rien de tout cela n'est public. Un lien d'amitié dit qui fréquente qui, un
-- abonnement push identifie un navigateur, un retrait dit combien une salle
-- a gagné : chacun ne voit que ce qui le concerne, et l'administration passe
-- par l'application.

alter table mb.friendships enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des amis, des abonnements push et des retraits.
--
--$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.push_subscriptions enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.push_subscriptions enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.payouts enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.payouts enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists friendships_read_own on mb.friendships;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists friendships_read_own on mb.friendships$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy friendships_read_own on mb.friendships for select
  using (requester_id = mb.current_user_id() or addressee_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy friendships_read_own on mb.friendships for sel$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists push_read_own on mb.push_subscriptions;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists push_read_own on mb.push_subscriptions$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy push_read_own on mb.push_subscriptions for select
  using (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy push_read_own on mb.push_subscriptions for sel$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists payouts_read_own on mb.payouts;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists payouts_read_own on mb.payouts;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy payouts_read_own on mb.payouts for select
  using (user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy payouts_read_own on mb.payouts for select
  us$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.friendships, mb.push_subscriptions, mb.payouts from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.friendships, mb.push_subscriptions, mb.payouts to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.friendships, mb.push_subscriptions, mb.payouts to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.friendships, mb.push_subscrip$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0027_groupes-invitations
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."crew_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crew_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'membre' NOT NULL,
	"status" text DEFAULT 'membre' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."crew_members" (
	"id" uuid PRIMARY KEY DE$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."crews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"devise" text DEFAULT '' NOT NULL,
	"owner_id" uuid NOT NULL,
	"venue_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crews_slug_unique" UNIQUE("slug")
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."crews" (
	"id" uuid PRIMARY KEY DEFAULT g$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"venue_id" uuid,
	"match_id" uuid,
	"crew_id" uuid,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'envoyee' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."invitations" (
	"id" uuid PRIMARY KEY DEF$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."crew_members" ADD CONSTRAINT "crew_members_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "mb"."crews"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."crew_members" ADD CONSTRAINT "crew_members$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."crew_members" ADD CONSTRAINT "crew_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."crew_members" ADD CONSTRAINT "crew_members$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."crews" ADD CONSTRAINT "crews_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."crews" ADD CONSTRAINT "crews_owner_id_user$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."crews" ADD CONSTRAINT "crews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."crews" ADD CONSTRAINT "crews_venue_id_venu$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_from_id_users_id_fk" FOREIGN KEY ("from_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_f$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_to_id_users_id_fk" FOREIGN KEY ("to_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_t$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_v$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "mb"."matches"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_m$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "mb"."crews"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."invitations" ADD CONSTRAINT "invitations_c$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE UNIQUE INDEX "crew_members_paire_idx" ON "mb"."crew_members" USING btree ("crew_id","user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE UNIQUE INDEX "crew_members_paire_idx" ON "mb"."crew_m$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "crew_members_user_idx" ON "mb"."crew_members" USING btree ("user_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "crew_members_user_idx" ON "mb"."crew_members" $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "invitations_to_idx" ON "mb"."invitations" USING btree ("to_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "invitations_to_idx" ON "mb"."invitations" USIN$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "invitations_batch_idx" ON "mb"."invitations" USING btree ("batch_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "invitations_batch_idx" ON "mb"."invitations" U$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0028_groupes_invitations_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des groupes et des invitations.
--
-- Un groupe est visible : c'est une bande qui se donne un nom, et le nom est
-- fait pour être vu. Qui en fait partie l'est aussi — on rejoint un groupe
-- pour y être compté.
--
-- Une invitation, non : elle dit où quelqu'un se trouve ce soir. Seuls
-- l'expéditeur et le destinataire la lisent.

alter table mb.crews enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des groupes et des invitations.
--
-- Un groupe est v$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.crew_members enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.crew_members enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.invitations enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.invitations enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists crews_read on mb.crews;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists crews_read on mb.crews;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy crews_read on mb.crews for select using (true);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy crews_read on mb.crews for select using (true)$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists crew_members_read on mb.crew_members;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists crew_members_read on mb.crew_members;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy crew_members_read on mb.crew_members for select
  using (status = 'membre' or user_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy crew_members_read on mb.crew_members for selec$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$drop policy if exists invitations_read_own on mb.invitations;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$drop policy if exists invitations_read_own on mb.invitations$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create policy invitations_read_own on mb.invitations for select
  using (from_id = mb.current_user_id() or to_id = mb.current_user_id());$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create policy invitations_read_own on mb.invitations for sel$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.crews, mb.crew_members, mb.invitations from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.crews, mb.crew_members, mb.invitations to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.crews to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.crews, mb.crew_members, mb.invitations to authenticated;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.crews, mb.crew_members, mb.in$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0029_fcm
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ALTER COLUMN "p256dh" SET DEFAULT '';$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ALTER COLUMN "p256dh" $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ALTER COLUMN "auth" SET DEFAULT '';$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ALTER COLUMN "auth" SE$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ADD COLUMN "provider" text DEFAULT 'web' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."push_subscriptions" ADD COLUMN "provider" $mbrattrapage$, 60); END $mbrattrapaged$;
-- 0030_code-joueur
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Le code à six chiffres de chaque joueur.
--
-- Drizzle proposait d'ajouter la colonne en NOT NULL d'un trait : cela
-- échouerait sur une base déjà peuplée. On l'ajoute donc vide, on la remplit,
-- et seulement ensuite on la rend obligatoire.
--
-- Le tirage boucle jusqu'à trouver un code libre. À six chiffres il y a neuf
-- cent mille possibilités : une collision est rare, mais une base qui grandit
-- finit toujours par en rencontrer une.

alter table mb.users add column if not exists code text;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Le code à six chiffres de chaque joueur.
--
-- Drizzle pr$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
declare
  ligne record;
  essai text;
begin
  for ligne in select id from mb.users where code is null loop
    loop
      essai := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
      exit when not exists (select 1 from mb.users where code = essai);
    end loop;
    update mb.users set code = essai where id = ligne.id;
  end loop;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
declare
  ligne record;
  essai text;
begin
  for lign$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.users alter column code set not null;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.users alter column code set not null;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create unique index if not exists users_code_idx on mb.users using btree (code);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create unique index if not exists users_code_idx on mb.users$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0031_fin-de-soiree
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."events" ADD COLUMN "ended_at" timestamp with time zone;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."events" ADD COLUMN "ended_at" timestamp wi$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0032_variantes-articles
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."product_images" (
	"id" uuid PRIMARY KEY $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"image" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."product_variants" (
	"id" uuid PRIMARY KE$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "variant_id" uuid;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "variant_id" uuid;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "variant_label" text DEFAULT '' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD COLUMN "variant_label" te$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "mb"."products"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."product_images" ADD CONSTRAINT "product_im$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "mb"."products"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."product_variants" ADD CONSTRAINT "product_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "product_images_product_idx" ON "mb"."product_images" USING btree ("product_id","sort");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "product_images_product_idx" ON "mb"."product_i$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "product_variants_product_idx" ON "mb"."product_variants" USING btree ("product_id","sort");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "product_variants_product_idx" ON "mb"."product$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "mb"."product_variants"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."order_items" ADD CONSTRAINT "order_items_v$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0033_variantes_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des déclinaisons et de la galerie.
--
-- Les deux tables prolongent `products`, qui est un catalogue public : une
-- saveur et une photo se lisent comme un prix. On ouvre donc la lecture aux
-- mêmes rôles, et rien d'autre — l'écriture passe par l'application, qui
-- vérifie que l'article appartient bien à celui qui le modifie.

alter table mb.product_images enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des déclinaisons et de la galerie.
--
-- Les deux tab$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$alter table mb.product_variants enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$alter table mb.product_variants enable row level security;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.product_images, mb.product_variants from public;

  execute 'create policy "galerie lisible" on mb.product_images for select using (true)';
  execute 'create policy "declinaisons lisibles" on mb.product_variants for select using (true)';

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on mb.product_images, mb.product_variants to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on mb.product_images, mb.product_variants to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.product_images, mb.product_variants to service_role;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.product_images, mb.product_va$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0034_amitie-unique
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- Une amitié, une seule ligne — quel que soit le sens.
--
-- `friendships_paire_idx` n'interdisait que le doublon dans le même sens :
-- A→B et B→A pouvaient coexister si les deux joueurs se demandaient en même
-- temps, chacun ne voyant pas encore la ligne de l'autre. Le profil lisait
-- alors « une » des deux lignes, sans ordre garanti, et pouvait proposer
-- « Ajouter en ami » à quelqu'un avec qui on était déjà ami.
--
-- On garde la ligne la plus avancée de chaque paire — une amitié acceptée
-- l'emporte sur une demande en attente, qui l'emporte sur un refus — puis on
-- rend la paire unique dans les deux sens.

with classees as (
  select
    id,
    row_number() over (
      partition by least(requester_id, addressee_id), greatest(requester_id, addressee_id)
      order by
        case status
          when 'acceptee' then 0
          when 'attente' then 1
          when 'bloquee' then 2
          else 3
        end,
        created_at
    ) as rang
  from mb.friendships
)
delete from mb.friendships
 where id in (select id from classees where rang > 1);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- Une amitié, une seule ligne — quel que soit le sens.
--
-$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$create unique index if not exists friendships_paire_sans_sens_idx
  on mb.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$create unique index if not exists friendships_paire_sans_sen$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0035_niveau-tournoi
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "min_level" integer DEFAULT 0 NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN "min_level" intege$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0036_prof-paye
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."enrollments" ADD COLUMN "coach_id" uuid;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."enrollments" ADD COLUMN "coach_id" uuid;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."enrollments" ADD COLUMN "commission" integer DEFAULT 0 NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."enrollments" ADD COLUMN "commission" integ$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."enrollments" ADD CONSTRAINT "enrollments_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."enrollments" ADD CONSTRAINT "enrollments_c$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0037_diffuseur-paye
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD COLUMN "host_id" uuid;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD COLUMN "host_id" uuid;$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD COLUMN "commission" integer DEFAULT 0 NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD COLUMN "commission" int$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD CONSTRAINT "stream_passes_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."stream_passes" ADD CONSTRAINT "stream_pass$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0038_defis
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"venue_id" uuid,
	"lieu_par_id" uuid,
	"kind" text DEFAULT '8-ball' NOT NULL,
	"target" integer DEFAULT 1 NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'propose' NOT NULL,
	"match_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."challenges" (
	"id" uuid PRIMARY KEY DEFA$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_from_id_users_id_fk" FOREIGN KEY ("from_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_fro$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_to_id_users_id_fk" FOREIGN KEY ("to_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_to_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "mb"."venues"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_ven$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_lieu_par_id_users_id_fk" FOREIGN KEY ("lieu_par_id") REFERENCES "mb"."users"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_lie$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "mb"."matches"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."challenges" ADD CONSTRAINT "challenges_mat$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "challenges_to_idx" ON "mb"."challenges" USING btree ("to_id","status");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "challenges_to_idx" ON "mb"."challenges" USING $mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "challenges_from_idx" ON "mb"."challenges" USING btree ("from_id","status");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "challenges_from_idx" ON "mb"."challenges" USIN$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0039_defis_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des défis.
--
-- Un défi ne regarde que ses deux joueurs : il porte une adresse de
-- rendez-vous et un message. Rien ne s'ouvre à `anon`, et l'application vérifie
-- de son côté que celui qui répond est bien l'un des deux.

alter table mb.challenges enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des défis.
--
-- Un défi ne regarde que ses deux joue$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.challenges from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.challenges to service_role;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.challenges from public;

  if$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0040_porte-du-groupe
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."crews" ADD COLUMN "access" text DEFAULT 'ouvert' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."crews" ADD COLUMN "access" text DEFAULT 'o$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."crews" ADD COLUMN "lien" text DEFAULT '' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."crews" ADD COLUMN "lien" text DEFAULT '' N$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0041_suivre-un-diffuseur
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE TABLE "mb"."follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"host_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE TABLE "mb"."follows" (
	"id" uuid PRIMARY KEY DEFAULT$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."follows" ADD CONSTRAINT "follows_follower_$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."follows" ADD CONSTRAINT "follows_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "mb"."users"("id") ON DELETE cascade ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."follows" ADD CONSTRAINT "follows_host_id_u$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE UNIQUE INDEX "follows_unique" ON "mb"."follows" USING btree ("follower_id","host_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE UNIQUE INDEX "follows_unique" ON "mb"."follows" USING$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX "follows_host_idx" ON "mb"."follows" USING btree ("host_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX "follows_host_idx" ON "mb"."follows" USING btre$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0042_suivis_rls
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$-- RLS des abonnements à un diffuseur.
--
-- Qui suit qui n'est pas un secret — le nombre d'abonnés s'affiche sur la
-- fiche du diffuseur — mais rien n'est ouvert à `anon` pour autant : la liste
-- se lit par l'application, qui sait qui la demande.

alter table mb.follows enable row level security;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$-- RLS des abonnements à un diffuseur.
--
-- Qui suit qui n'$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$do $$
begin
  revoke all on mb.follows from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on mb.follows to service_role;
  end if;
end;
$$;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$do $$
begin
  revoke all on mb.follows from public;

  if ex$mbrattrapage$, 60); END $mbrattrapaged$;
-- 0043_categories-tableaux
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'open' NOT NULL;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "cat$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "parent_id" uuid;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD COLUMN IF NOT EXISTS "par$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_parent_id_tournaments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "mb"."tournaments"("id") ON DELETE set null ON UPDATE no action;$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$ALTER TABLE "mb"."tournaments" ADD CONSTRAINT "tournaments_p$mbrattrapage$, 60); END $mbrattrapaged$;
DO $mbrattrapaged$ BEGIN EXECUTE $mbrattrapage$CREATE INDEX IF NOT EXISTS "tournaments_parent_idx" ON "mb"."tournaments" USING btree ("parent_id");$mbrattrapage$; EXCEPTION WHEN duplicate_table OR duplicate_column OR duplicate_object OR duplicate_schema OR duplicate_function OR undefined_object OR undefined_column OR undefined_table THEN RAISE NOTICE 'déjà là : %', left($mbrattrapage$CREATE INDEX IF NOT EXISTS "tournaments_parent_idx" ON "mb".$mbrattrapage$, 60); END $mbrattrapaged$;
CREATE TABLE IF NOT EXISTS mb.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'dbcbbbf172924b35f570f130376694a4140ad8df7dd98e4cece4999902bb212d', 1789954581653 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789954581653);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'c6315389e34445ef2de587c90d9d6f5e0359435f7cea206e4abacc05a60fae28', 1789955041448 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789955041448);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'a8343802b3500bfe01b03301e000b4abf7ba44fa584e50ee8967d81099845827', 1789956779898 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789956779898);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '65f485b73e11a50dd316b9c3ba09ff2a1adc1cad6526cc02c9d08dc2ada90f4e', 1789956789257 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789956789257);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '5ef1c7e41194cda4ccad025b77d2e28e97da0d0a7d1569c13af1e8bca68f2d9c', 1789958111152 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789958111152);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'c88161b3a013f2fc477f83de958cf400eb250f3e6e939e7df840f27898a71b8a', 1789958121223 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789958121223);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '7ab0480d92250740112a3c0e29049a1b83ef0ad461bd345dfde349b043dfda9a', 1789990818917 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789990818917);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'b182c9ab9aa0453d1d67078117ebc2c089133355f7b33be26c29e7451d05560a', 1789990830160 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789990830160);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'b6b61577b1ca113fd03afb1aa5052a9341e72469f674c8b5ad02128c6e9fd270', 1789991103981 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789991103981);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '4a21a8621982148fd3ade0e0c0e4485120702748ada7bc9e96a7c16b9b3b044c', 1789991113369 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789991113369);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'c0166a6188278a29267db2707d217748b98fd2910c884dbbc5587676c5406a7e', 1789994522409 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789994522409);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'ff65a81aa61f022f51977ec6917a07c5af1e265c3772ae95734b1b1c3586b3aa', 1789994537166 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789994537166);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '83df77d66246faa49f45212567eb4d936d4e12d72fd90261bfcd2d401c86dc3e', 1789995551853 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789995551853);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '3dfe93a6d4dd9219d9964a8f0fe13dad5f4ab0c4c12a2aaa790cf6b6bb95c52c', 1789995822174 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1789995822174);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '0e46c31f7a4e533d6d1bae676310c488b8c74b27b48e45f30ca8e8f3a510c5ba', 1790025156912 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790025156912);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'c18be9545b8978bf937e3cb6fbbc37b16f8b4130cb949035168752318663438a', 1790025156913 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790025156913);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '453f479699143fbd351bafd6f01e5f72b37cf2687260d90aa12bceecf2a9786a', 1790026626282 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790026626282);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'd7563a872dc7891d1f24fe22e49a2d5d2bedee1c79b52f4c60222104b7c68107', 1790039322541 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790039322541);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '4f2158b255e65afe9988e2fefceeadbb5f924168d9df5f16e0924e6a39d84c5c', 1790039322542 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790039322542);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '5e5d4d7e0b19ec9fe2604f4762c90af8c1281229934f3ae4f7bf1e64a7529fc6', 1790085710615 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790085710615);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '31f0b6da42604082ab0d17c8ce2b54107a0973ba4d6dcd4a834530177ad56760', 1790085710616 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790085710616);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'd534f75602e29d52d686c0b28154fef1e12471a77aacef52589f9a02679dc5ad', 1790092073740 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790092073740);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '2548901e3285de45d366c65fd1faad8e412480285ab8fdde074f41b4ef867950', 1790092073741 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790092073741);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '5c28cd9bd303d087a9a7c31a65f17f93db43eefc7563e67f23285573822cd8f2', 1790102497598 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790102497598);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'a0f78bfec833a5eb13a090f41243fa3b5781069d59274616a9a1a679f0ccaf65', 1790102497599 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790102497599);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'b7556ec8224fcfc655f0f1055c630df8b1a163b0d11e9c42d68ba196ac8339c1', 1790114703614 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790114703614);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '5703017411108105c179c163902b7f448e16746f2209d456ad15a7491aa17de9', 1790114703615 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790114703615);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '1fb52261533f7a8330c9a2fd3bf284cafbcf5c4d61d1db9c3b80ecd201f83972', 1790118042834 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790118042834);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'd8ad8c04f57c9bbec979a2a33747b7bfbe32e5732feb882d39640c06882f39f0', 1790118042835 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790118042835);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '37bd40e6a8c8c9df176e7f6f215389cf254dc65a3593ed8c594f08a4a54970c0', 1790124460436 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790124460436);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '40180554fa55a7515cacdb84f8e21b383d4639189c1f5ecf8acb642554082dce', 1790127482489 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790127482489);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '8a4768b037fba2069780c9734731d4f464c6d999c38a9e84937ea947b1664dbc', 1790173164631 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790173164631);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '2bd572981dce067219e8496244db3743effd730255573def2506bed5cb921884', 1790175761967 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790175761967);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'c2ab5797b0f5656d59e7de2a982a02005bba08e606eb5d5338986f63f009e981', 1790175762967 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790175762967);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'c36c45642e023f3c1ec55289cecf880ef2f9961a3d1bd1ee1c7672b339276b0e', 1790175763967 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790175763967);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'cf1d326cc77bfae9e577c599a7b5c5995612431bb78a7242c6e843731d6d9cc6', 1790366445218 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790366445218);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '65ee3e71729f72be8f57d3fe44941ba13d3c8f82ea95739a1672673fe177a258', 1790367361570 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790367361570);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '616d67a6f71351e90ada0ba3b92d07d72ebfd0b69efd19d8a5b1c19f96ab4ee8', 1790368013350 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790368013350);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '71d435dfcdb15767ec856e3cfb1e3e873240e64cdfa0f08e3f6eb505bb26edbe', 1790371042055 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790371042055);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'dff5d63712653d1279265eaae4d805f957ee57cc448a75b255e27611e389c01c', 1790371043055 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790371043055);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '8a83fd7695e113c3d831439e1482bd7d294dd0ec01d3be427bb574007a2c5ea8', 1790387830058 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790387830058);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT 'de7fd01cffc60968595c071ba27eb2e975c6959d1f14cd054d917d0732b21ed3', 1790389054748 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790389054748);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '7f396dc586c524330b7405c02a708ab150b3533c11a57ec0dd0e2506429f1a33', 1790389054749 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790389054749);
INSERT INTO mb.__drizzle_migrations (hash, created_at) SELECT '4db7f9cc449e322042ca17b39b7476d5585ad0c0b1f314bf49172c54bc739249', 1790389054750 WHERE NOT EXISTS (SELECT 1 FROM mb.__drizzle_migrations WHERE created_at = 1790389054750);
-- Tout le schéma appartient au compte de l'application.
ALTER SCHEMA mb OWNER TO app_mb;
SELECT format('ALTER TABLE mb.%I OWNER TO app_mb', tablename) FROM pg_tables WHERE schemaname = 'mb' \gexec
SELECT format('ALTER SEQUENCE mb.%I OWNER TO app_mb', sequencename) FROM pg_sequences WHERE schemaname = 'mb' \gexec
SELECT format('ALTER FUNCTION mb.%I(%s) OWNER TO app_mb', p.proname, pg_get_function_identity_arguments(p.oid))
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'mb' \gexec
GRANT anon, authenticated, service_role TO app_mb;
-- Drizzle exécute « CREATE SCHEMA IF NOT EXISTS mb » à chaque démarrage, et
-- Postgres exige pour cela le droit de créer des schémas dans la base, même
-- quand le schéma existe déjà. Sans lui, kix ne passait jamais ses migrations.
GRANT CREATE ON DATABASE postgres TO app_mb;
COMMIT;
SELECT count(*) AS migrations_enregistrees FROM mb.__drizzle_migrations;
