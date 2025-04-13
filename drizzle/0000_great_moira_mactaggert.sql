CREATE TYPE "public"."place_level_goal_types" AS ENUM('coins', 'tip', 'xp', 'customers');--> statement-breakpoint
CREATE TYPE "public"."place_types" AS ENUM('restaurant', 'event');--> statement-breakpoint
CREATE TABLE "manager_sessions" (
	"manager_session_id" text PRIMARY KEY NOT NULL,
	"manager_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"manager_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managers_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "place_item_upgrades" (
	"item_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_item_upgrades_item_id_player_id_pk" PRIMARY KEY("item_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "place_items" (
	"item_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "place_items_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"place_id" integer NOT NULL,
	"game_item" text NOT NULL,
	"unlocks_in" integer NOT NULL,
	"max_level" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_items_gameItem_placeId_unique" UNIQUE("game_item","place_id")
);
--> statement-breakpoint
CREATE TABLE "place_level_goal_progresses" (
	"goal_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"obtained_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_level_goal_progresses_goal_id_player_id_pk" PRIMARY KEY("goal_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "place_level_goals" (
	"goal_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "place_level_goals_goal_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"level_id" integer NOT NULL,
	"goal_type" "place_level_goal_types" NOT NULL,
	"goal_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_level_goals_levelId_goalType_unique" UNIQUE("level_id","goal_type")
);
--> statement-breakpoint
CREATE TABLE "place_levels" (
	"level_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "place_levels_level_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"place_id" integer NOT NULL,
	"level_no" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_levels_placeId_levelNo_unique" UNIQUE("place_id","level_no")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"place_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "places_place_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" "place_types" NOT NULL,
	"name" text NOT NULL,
	"unlocks_at" integer NOT NULL,
	"price" integer NOT NULL,
	"position" "point" NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_price_check" CHECK ("places"."price" >= 0),
	CONSTRAINT "place_unlocks_at_check" CHECK ("places"."unlocks_at" >= 1)
);
--> statement-breakpoint
CREATE TABLE "player_sessions" (
	"player_session_id" text PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"player_id" uuid PRIMARY KEY NOT NULL,
	"player_level" integer NOT NULL,
	"coins" integer NOT NULL,
	"experience_points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"player_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_username_unique" UNIQUE("username"),
	CONSTRAINT "players_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "unlocked_places" (
	"place_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unlocked_places_place_id_player_id_pk" PRIMARY KEY("place_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "manager_sessions" ADD CONSTRAINT "manager_sessions_manager_id_managers_manager_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("manager_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_item_upgrades" ADD CONSTRAINT "place_item_upgrades_item_id_place_items_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."place_items"("item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_item_upgrades" ADD CONSTRAINT "place_item_upgrades_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_items" ADD CONSTRAINT "place_items_place_id_places_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("place_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_items" ADD CONSTRAINT "place_items_unlocks_in_place_levels_level_id_fk" FOREIGN KEY ("unlocks_in") REFERENCES "public"."place_levels"("level_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_level_goal_progresses" ADD CONSTRAINT "place_level_goal_progresses_goal_id_place_level_goals_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."place_level_goals"("goal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_level_goal_progresses" ADD CONSTRAINT "place_level_goal_progresses_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_level_goals" ADD CONSTRAINT "place_level_goals_level_id_place_levels_level_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."place_levels"("level_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_levels" ADD CONSTRAINT "place_levels_place_id_places_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("place_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_places" ADD CONSTRAINT "unlocked_places_place_id_places_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("place_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_places" ADD CONSTRAINT "unlocked_places_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE cascade ON UPDATE no action;