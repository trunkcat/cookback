import { Router } from "@oak/oak";
import { z } from "zod";
import { db, schema } from "../../database/index.js";
import { parseBody } from "../../utils.js";

const router = new Router({ prefix: "/locations" });

router.get("/", async (ctx) => {
	const locations = await db.select().from(schema.locations);
	ctx.response.body = locations;
	ctx.response.headers.set("content-type", "application/json");
});

const postSchema = z.object({
	name: z.string(),
	coins_needed: z.number().positive(),
	unlocks_at: z.number().positive(),
});

router.post("/", async (ctx) => {
	const parsed = await parseBody(ctx, postSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: parsed.message };
		return;
	}

	const inserted = await db
		.insert(schema.locations)
		.values({
			name: parsed.data.name,
			unlocksAt: parsed.data.unlocks_at,
			coinsNeeded: parsed.data.coins_needed,
		})
		.returning();

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: inserted };
});

export const locationsRouter = router;
