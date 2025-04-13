import { Router } from "@oak/oak";
import { z } from "zod";
import { db, schema } from "../../../database/index.js";
import { PLACE_TYPE } from "../../../database/schema-types.js";
import { parseBody } from "../../../utilities.js";

const router = new Router({ prefix: "/places" });

const postSchema = z.object({
	name: z.string().min(3),
	type: z.enum(PLACE_TYPE),
	description: z.string().min(16).max(256),
	price: z.number().nonnegative().default(0),
	unlocksAt: z.number().positive().default(1),
	positionX: z.number().default(0),
	positionY: z.number().default(0),
});

router.post("/", async (ctx) => {
	const parsed = await parseBody(ctx, postSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		console.error(parsed.message);
		ctx.response.body = { ok: false, message: "Invalid place details" };
		return;
	}

	const place = await db.insert(schema.place)
		.values({
			name: parsed.data.name,
			description: parsed.data.description,
			type: parsed.data.type,
			position: [parsed.data.positionX, parsed.data.positionY],
			price: parsed.data.price,
			unlocksAt: parsed.data.unlocksAt,
		})
		.returning();

	ctx.response.body = place;
});

export default router;
