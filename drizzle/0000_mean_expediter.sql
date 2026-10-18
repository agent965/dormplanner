CREATE TYPE "public"."dietary_tag" AS ENUM('vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'halal', 'kosher', 'contains_pork', 'contains_alcohol');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('yes', 'maybe', 'no');--> statement-breakpoint
CREATE TABLE "bring_items" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_by_name" text NOT NULL,
	"created_by_id" text,
	"created_by_guest_id" text,
	"claimed_by_name" text,
	"claimed_by_id" text,
	"claimed_by_guest_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dorms" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"host_id" text NOT NULL,
	"dorm_slug" text,
	"location" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"capacity" integer,
	"tags" "dietary_tag"[] DEFAULT '{}' NOT NULL,
	"open_to_all_dorms" boolean DEFAULT false NOT NULL,
	"canceled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leftovers" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text,
	"posted_by_id" text NOT NULL,
	"dorm_slug" text,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text,
	"guest_id" text,
	"guest_name" text,
	"status" "rsvp_status" NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"dorm_slug" text,
	"floor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "bring_items" ADD CONSTRAINT "bring_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bring_items" ADD CONSTRAINT "bring_items_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bring_items" ADD CONSTRAINT "bring_items_claimed_by_id_users_id_fk" FOREIGN KEY ("claimed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_dorm_slug_dorms_slug_fk" FOREIGN KEY ("dorm_slug") REFERENCES "public"."dorms"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leftovers" ADD CONSTRAINT "leftovers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leftovers" ADD CONSTRAINT "leftovers_posted_by_id_users_id_fk" FOREIGN KEY ("posted_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leftovers" ADD CONSTRAINT "leftovers_dorm_slug_dorms_slug_fk" FOREIGN KEY ("dorm_slug") REFERENCES "public"."dorms"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bring_items_event_idx" ON "bring_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_dorm_idx" ON "events" USING btree ("dorm_slug");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "leftovers_dorm_idx" ON "leftovers" USING btree ("dorm_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_event_user_uidx" ON "rsvps" USING btree ("event_id","user_id") WHERE "rsvps"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_event_guest_uidx" ON "rsvps" USING btree ("event_id","guest_id") WHERE "rsvps"."guest_id" IS NOT NULL;