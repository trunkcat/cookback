CREATE TABLE "player_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" serial NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "location_levels" DROP CONSTRAINT "location_levels_location_id_locations_location_id_fk";
--> statement-breakpoint
ALTER TABLE "player_stats" DROP CONSTRAINT "player_stats_player_id_players_player_id_fk";
--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_levels" ADD CONSTRAINT "location_levels_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE cascade ON UPDATE no action;