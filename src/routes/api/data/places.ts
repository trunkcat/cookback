import { Router } from "@oak/oak";
import { eq } from "drizzle-orm";
import { db, schema } from "../../../database/index.js";

const router = new Router({ prefix: "/places" });

router.get("/", async (ctx) => {
	const places = await db.query.place.findMany({
		columns: {
			placeId: true,
			name: true,
			description: true,
			type: true,
			position: true,
			price: true,
			unlocksAt: true,
		},
		with: {
			levels: {
				columns: {
					levelId: true,
					levelNo: true,
				},
				with: {
					goals: {
						columns: {
							goalId: true,
							goalType: true,
							goalValue: true,
						},
					},
				},
			},
			items: {
				columns: {
					itemId: true,
					gameItem: true,
					maxLevel: true,
					unlocksIn: true,
				},
			},
		},
	});

	ctx.response.body = { ok: true, data: places };
});

router.get("/:placeId", async (ctx) => {
	const placeId = Number(ctx.params.placeId);
	if (placeId == null || isNaN(Number(placeId))) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid place ID" };
		return;
	}

	const place = await db.query.place.findFirst({
		where: eq(schema.place.placeId, placeId),
		with: { levels: true, items: true },
	});

	ctx.response.body = place;
});

export default router;
