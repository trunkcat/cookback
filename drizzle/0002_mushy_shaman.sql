CREATE TYPE "public"."manager_roles" AS ENUM('manager', 'supermanager');--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN "role" "manager_roles" NOT NULL;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_email_unique" UNIQUE("email");