import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

export default defineConfig({
	schema: "./src/database/schema.ts",
	verbose: true,
	strict: true,
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
