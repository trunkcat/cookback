CREATE TABLE "location_levels" (
	"level_id" serial PRIMARY KEY NOT NULL,
	"level" integer,
	"location_id" serial NOT NULL,
	"score_required" integer NOT NULL,
	CONSTRAINT "location_levels_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"location_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unlocks_at" integer NOT NULL,
	"coins_needed" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"manager_id" serial PRIMARY KEY NOT NULL,
	"manager_name" text NOT NULL,
	CONSTRAINT "managers_managerName_unique" UNIQUE("manager_name")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"player_id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"username" text NOT NULL,
	CONSTRAINT "players_email_unique" UNIQUE("email"),
	CONSTRAINT "players_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"player_id" serial PRIMARY KEY NOT NULL,
	"player_level" integer NOT NULL,
	"coins" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "location_levels" ADD CONSTRAINT "location_levels_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;