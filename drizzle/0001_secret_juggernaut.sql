ALTER TABLE "places" ADD CONSTRAINT "places_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "public"."places" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."place_types";--> statement-breakpoint
CREATE TYPE "public"."place_types" AS ENUM('restaurant');--> statement-breakpoint
ALTER TABLE "public"."places" ALTER COLUMN "type" SET DATA TYPE "public"."place_types" USING "type"::"public"."place_types";