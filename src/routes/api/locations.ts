import { Router } from "@oak/oak";
import { z } from "zod";
import { db, schema } from "../../database.js";
import { verify } from "../../jwt.js";

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
	if (!ctx.request.body.has) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, reason: "Expected body" };
		return;
	}
	if (ctx.request.headers.get("content-type") !== "application/json") {
		ctx.response.status = 400;
		ctx.response.body = {
			ok: false,
			reason: "Expected content type to be JSON",
		};
		return;
	}

	let data: z.infer<typeof postSchema>;
	try {
		const body = await ctx.request.body.json();
		data = postSchema.parse(body);
	} catch (error) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, reason: "Invalid body" };
		return;
	}

	const inserted = await db
		.insert(schema.locations)
		.values({
			name: data.name,
			unlocksAt: data.unlocks_at,
			coinsNeeded: data.coins_needed,
		})
		.returning();

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: inserted };
});

router.use(async (ctx, next) => {
	const authToken = ctx.request.headers.get("Authorization");
	if (!authToken) {
		ctx.response.status = 401;
		ctx.response.body = { ok: false, reason: "Unauthorized" };
		return;
	}

	try {
		await verify(authToken);
	} catch (error) {
		console.error(error);
		ctx.response.status = 401;
		ctx.response.body = { ok: false, reason: "Unauthorized" };
		return;
	}

	await next();
});

export const locationsRouter = router;
