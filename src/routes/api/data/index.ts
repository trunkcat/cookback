import { Router } from "@oak/oak";
import { db } from "../../../database/index.js";

const router = new Router({ prefix: "/data" });

router.get("/places", async (ctx) => {
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
	ctx.response.body = places;
});

export default router;
