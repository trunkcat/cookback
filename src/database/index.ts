import { neon } from "@neondatabase/serverless";
import { and, eq, not, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { hashPassword, verifyPassword } from "../auth.js";
import { env } from "../env.js";
import * as schema from "./schema.js";

const connectionString = env.DATABASE_URL;

const neonClient = neon(connectionString!);

export const db = drizzle({
	client: neonClient,
	schema: schema,
	casing: "snake_case",
});

export { schema };

export const SUPERMANAGER_USERNAME = env.SUPERMANAGER_USERNAME;
export const SUPERMANAGER_PASSWORD = env.SUPERMANAGER_PASSWORD;

// Setup the supermanager account:
(async () => {
	console.log("Setting up supermanager account...");

	const supermanagers = await db.query.manager.findMany({
		where: () => eq(schema.manager.role, "supermanager"),
	});

	const current = supermanagers
		.find((supermanager) => supermanager.username === SUPERMANAGER_USERNAME);

	if (current == null) {
		console.log("Couldn't find current supermanager account, setting one up");
		await db.delete(schema.manager).where(
			eq(schema.manager.role, "supermanager"),
		);
		const hash = await hashPassword(SUPERMANAGER_PASSWORD);
		await db.insert(schema.manager)
			.values({
				username: SUPERMANAGER_USERNAME,
				email: SUPERMANAGER_USERNAME,
				passwordHash: hash,
				role: "supermanager",
			});
		console.log("Setup supermanager account successfully.");
		return;
	}

	const isPasswordCorrect = await verifyPassword(
		current.passwordHash,
		SUPERMANAGER_PASSWORD,
	);
	if (!isPasswordCorrect) {
		console.log("Found supermanager account, fixing the incorrect password");
		const hash = await hashPassword(SUPERMANAGER_PASSWORD);
		await db.update(schema.manager)
			.set({ passwordHash: hash })
			.where(eq(schema.manager.managerId, current.managerId));
	}

	if (supermanagers.length > 1) {
		console.log(
			"Found more than one supermanager accounts, deleting the unncessary ones",
		);
		await db.delete(schema.manager)
			.where(
				and(
					eq(schema.manager.role, "supermanager"),
					// Delete all the other supermanager account instances
					not(eq(schema.manager.managerId, current.managerId)),
				),
			);
	}

	console.log("Setup supermanager account successfully.");

	// TRIGGERS
	console.log("Setting up triggers");

	await db.execute(sql`
		DROP TRIGGER IF EXISTS after_insert_player_trigger
		ON players;`);

	await db.execute(sql`
		CREATE OR REPLACE FUNCTION create_player_stats_after_insert()
		RETURNS TRIGGER AS $$
		BEGIN
			INSERT INTO player_stats (player_id, player_level, coins, experience_points)
			VALUES (NEW.player_id, 1, 0, 0);
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;`);

	await db.execute(`
		CREATE TRIGGER after_insert_player_trigger
		AFTER INSERT ON players
		FOR EACH ROW
		EXECUTE FUNCTION create_player_stats_after_insert();`);

	console.log("Setup triggers successfully!");
})();
