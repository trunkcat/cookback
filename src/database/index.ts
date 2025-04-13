import { neon } from "@neondatabase/serverless";
import { and, eq, not } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { hashPassword, verifyPassword } from "../auth.js";
import { env } from "../env.js";
import * as schema from "./schema.js";

const connectionString = env.DATABASE_URL;

const sql = neon(connectionString!);

export const db = drizzle({
	client: sql,
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
})();
