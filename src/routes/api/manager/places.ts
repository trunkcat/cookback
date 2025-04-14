import { Router } from "@oak/oak";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../../database/index.js";
import { GOAL_TYPE, PLACE_TYPE } from "../../../database/schema-types.js";
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

router.post("/level", async (ctx) => {
	const post = z.object({
		placeId: z.number(),
		levelNo: z.number().min(1),
		goals: z
			.array(z.object({
				type: z.enum(GOAL_TYPE),
				value: z.number().min(0),
			}))
			.min(1)
			.max(GOAL_TYPE.length)
			.refine((goals) => goals.some((goal) => goal.value > 0)),
	});
	const parsed = await parseBody(ctx, post);
	if (!parsed.ok) {
		ctx.response.status = 400;
		console.error(parsed.message);
		ctx.response.body = { ok: false, message: "Invalid level details" };
		return;
	}

	const [placeLevel] = await db
		.insert(schema.placeLevel)
		.values({
			levelNo: parsed.data.levelNo,
			placeId: parsed.data.placeId,
		}).returning();

	const goals = await db
		.insert(schema.placeLevelGoal)
		.values(parsed.data.goals.map((goal) => {
			return {
				levelId: placeLevel.levelId,
				goalType: goal.type,
				goalValue: goal.value,
			};
		})).returning();

	ctx.response.body = { ...placeLevel, goals };
});

router.post("/item", async (ctx) => {
	const post = z.object({
		placeId: z.number(),
		unlocksIn: z.number().min(1),
		gameItem: z.string().nonempty(),
		maxLevel: z.number().min(1),
	});
	const parsed = await parseBody(ctx, post);
	if (!parsed.ok) {
		ctx.response.status = 400;
		console.error(parsed.message);
		ctx.response.body = { ok: false, message: "Invalid item details" };
		return;
	}

	const level = await db.query.placeLevel.findFirst({
		where: and(
			eq(schema.placeLevel.levelNo, parsed.data.unlocksIn),
			eq(schema.placeLevel.placeId, parsed.data.placeId),
		),
	});

	if (level == null) {
		ctx.response.status = 400;
		ctx.response.body = {
			ok: false,
			message: "Unlocking level doesn't exist in the place",
		};
		return;
	}

	const [placeItem] = await db
		.insert(schema.placeItem)
		.values({
			placeId: parsed.data.placeId,
			gameItem: parsed.data.gameItem,
			maxLevel: parsed.data.maxLevel,
			unlocksIn: level.levelId,
		}).returning();

	ctx.response.body = placeItem;
});

export default router;
