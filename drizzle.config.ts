import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";

export default defineConfig({
	schema: "./src/database/schema.ts",
	verbose: true,
	strict: true,
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
