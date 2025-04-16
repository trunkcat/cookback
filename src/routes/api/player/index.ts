import { Router } from "@oak/oak";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
	calculateSessionIdFromToken,
	generateSessionToken,
	hashPassword,
	verifyPassword,
} from "../../../auth.js";
import {
	SESSION_EXPIRATION_PERIOD,
	SESSION_RENEWAL_PERIOD,
} from "../../../constants.js";
import { db, schema } from "../../../database/index.js";
import { parseBody } from "../../../utilities.js";

interface State {
	playerId: string;
	sessionId: string;
}

const router = new Router<State>({ prefix: "/player" });

const registerSchema = z.object({
	username: z.string().nonempty(),
	email: z.string().email(),
	password: z.string().nonempty(),
});

router.post("/register", async (ctx) => {
	const parsed = await parseBody(ctx, registerSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid credentials" };
		return;
	}

	const [existingPlayer] = await db
		.select({ playerId: schema.player.playerId })
		.from(schema.player)
		.where(eq(schema.player.username, parsed.data.username));

	if (existingPlayer != null) {
		ctx.response.status = 400;
		ctx.response.body = {
			ok: false,
			message: "Player with the same username already exists",
		};
		return;
	}

	const hashedPassword = await hashPassword(parsed.data.password);
	const [player] = await db
		.insert(schema.player)
		.values({
			username: parsed.data.username,
			email: parsed.data.email,
			passwordHash: hashedPassword,
		})
		.returning({ playerId: schema.player.playerId });

	const PLAYER_LEVEL = 1;

	const places = await db.select(
		{ placeId: schema.place.placeId },
	).from(schema.place).where(
		and(eq(schema.place.unlocksAt, PLAYER_LEVEL), eq(schema.place.price, 0)),
	);

	if (places.length > 0) {
		await db.insert(schema.unlockedPlace)
			.values(
				places.map((place) => ({
					placeId: place.placeId,
					playerId: player.playerId,
				})),
			);
	}

	const sessionToken = generateSessionToken();
	await createPlayerSession(sessionToken, player.playerId);

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: { sessionToken } };
});

const loginSchema = z.object({
	username: z.string().nonempty(),
	password: z.string().nonempty(),
});

router.post("/login", async (ctx) => {
	const parsed = await parseBody(ctx, loginSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid credentials" };
		return;
	}

	const [player] = await db
		.select({
			playerId: schema.player.playerId,
			passwordHash: schema.player.passwordHash,
		})
		.from(schema.player)
		.where(eq(schema.player.username, parsed.data.username));

	if (player == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Player not found" };
		return;
	}

	const isCorrect = await verifyPassword(
		player.passwordHash,
		parsed.data.password,
	);
	if (!isCorrect) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid credentials" };
		return;
	}

	const sessionToken = generateSessionToken();
	await createPlayerSession(sessionToken, player.playerId);

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: { sessionToken } };
});

router.use(async (ctx, next) => {
	const authToken = ctx.request.headers.get("Authorization")?.trim();
	if (!authToken) {
		ctx.response.status = 401;
		ctx.response.body = { ok: false, message: "Authorization required" };
		return;
	}
	const BEARER_PREFIX = "Bearer ";
	if (
		authToken.length <= BEARER_PREFIX.length + 1 ||
		!authToken.startsWith(BEARER_PREFIX)
	) {
		ctx.response.status = 401;
		ctx.response.body = { ok: false, message: "Invalid authorization header" };
		return;
	}

	const sessionToken = authToken.slice(BEARER_PREFIX.length);
	const result = await validatePlayerSessionToken(sessionToken);
	if (result == null) {
		ctx.response.status = 401;
		ctx.response.body = { ok: false, message: "Unauthorized" };
		return;
	}

	ctx.state = { playerId: result.playerId, sessionId: result.sessionId };
	await next();
});

router.delete("/logout", async (ctx) => {
	const [session] = await db
		.delete(schema.playerSession)
		.where(
			and(
				eq(schema.playerSession.playerSessionId, ctx.state.sessionId),
				eq(schema.playerSession.playerId, ctx.state.playerId),
			),
		)
		.returning({ id: schema.playerSession.playerSessionId });

	if (session == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Session not found" };
		return;
	}

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: true };
});

router.get("/", async (ctx) => {
	const player = await db.query.player.findFirst({
		where: eq(schema.player.playerId, ctx.state.playerId),
		columns: {
			playerId: true,
			username: true,
			email: true,
		},
		with: {
			stats: {
				columns: {
					playerLevel: true,
					coins: true,
					experiencePoints: true,
				},
			},
			unlockedPlaces: {
				columns: {},
				with: {
					place: {
						columns: { placeId: true },
						with: {
							levels: {
								columns: { levelId: true },
								with: {
									goals: {
										columns: { goalId: true },
										with: {
											progresses: { columns: { obtainedValue: true } },
										},
									},
								},
							},
							items: {
								columns: { itemId: true },
								with: {
									upgrades: { columns: { level: true } },
								},
							},
						},
					},
				},
			},
		},
	});

	if (player == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Player not found" };
		return;
	}

	const data = {
		...player,
		unlockedPlaces: player.unlockedPlaces.map((unlockedPlace) => {
			const completedLevels = unlockedPlace.place.levels.map((level) => {
				const goalProgresses = level.goals.map((goal) => {
					if (goal.progresses.length == 0) {
						return null;
					}
					return {
						goalId: goal.goalId,
						obtainedValue: goal.progresses[0].obtainedValue,
					};
				}).filter((goal) => goal != null);
				if (goalProgresses.length == 0) {
					return null;
				}
				return {
					levelId: level.levelId,
					goalProgresses: goalProgresses,
				};
			}).filter((level) => level != null);

			const itemUpgrades = unlockedPlace.place.items.map((item) => {
				if (item.upgrades.length == 0) {
					return null;
				}
				return {
					goalId: item.itemId,
					upgrades: item.upgrades[0].level,
				};
			}).filter((upgrade) => upgrade != null);

			return {
				placeId: unlockedPlace.place.placeId,
				completedLevels: completedLevels,
				upgradedItems: itemUpgrades,
			};
		}),
	};

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data };
});

const goalSchema = z.object({
	placeId: z.number(),
	levelId: z.number(),
	goals: z.record(z.coerce.number(), z.number())
		.refine((goals) => Object.keys(goals).length > 0),
});

router.put("/goal", async (ctx) => {
	const parsed = await parseBody(ctx, goalSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid details" };
		return;
	}

	const excludedObtainedValue = sql.raw(`excluded.obtained_value`); // stupid drizzle

	const updated = await db.insert(schema.placeLevelGoalProgress)
		.values(
			Object.keys(parsed.data.goals).map((key) => {
				const goalId = Number(key);
				return {
					goalId: goalId,
					obtainedValue: parsed.data.goals[goalId],
					playerId: ctx.state.playerId,
				};
			}),
		).onConflictDoUpdate({
			target: [
				schema.placeLevelGoalProgress.goalId,
				schema.placeLevelGoalProgress.playerId,
			],
			set: { obtainedValue: excludedObtainedValue },
			setWhere:
				sql`${schema.placeLevelGoalProgress.obtainedValue} < ${excludedObtainedValue}`,
		})
		.returning({
			goalId: schema.placeLevelGoalProgress.goalId,
			obtainedValue: schema.placeLevelGoalProgress.obtainedValue,
		});

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: updated };
});

const placePurchaseSchema = z.object({
	placeId: z.number(),
});

router.post("/place", async (ctx) => {
	const parsed = await parseBody(ctx, placePurchaseSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid details" };
		return;
	}

	await db.insert(schema.unlockedPlace)
		.values({
			placeId: parsed.data.placeId,
			playerId: ctx.state.playerId,
		});

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: true };
});

router.get("/leaderboard", async (ctx) => {
	const MAX_LEADERBOARD_LIMIT = 50;

	const baseQuery = db.select({
		playerId: schema.player.playerId,
		username: schema.player.username,
		experiencePoints: schema.playerStats.experiencePoints,
		coins: schema.playerStats.coins,
		playerLevel: schema.playerStats.playerLevel,
	})
		.from(schema.playerStats)
		.innerJoin(
			schema.player,
			eq(schema.playerStats.playerId, schema.player.playerId),
		);

	const data = await baseQuery
		.orderBy(desc(schema.playerStats.experiencePoints))
		.limit(MAX_LEADERBOARD_LIMIT);

	if (!data.some((entry) => entry.playerId == ctx.state.playerId)) {
		const [playerData] = await baseQuery
			.where(eq(schema.playerStats.playerId, ctx.state.playerId));
		data.push(playerData);
	}

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: data };
});

const statsUpdateSchema = z.object({
	coins: z.number(),
	experiencePoints: z.number(),
	playerLevel: z.number(),
});

router.put("/stats", async (ctx) => {
	const parsed = await parseBody(ctx, statsUpdateSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid details" };
		return;
	}

	await db.update(schema.playerStats)
		.set({
			coins: parsed.data.coins,
			experiencePoints: parsed.data.experiencePoints,
			playerLevel: parsed.data.playerLevel,
		})
		.where(eq(schema.playerStats.playerId, ctx.state.playerId));

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: true };
});

export default router;

// AUTH FUNCTIONS

async function createPlayerSession(
	token: string,
	playerId: string,
): Promise<string> {
	const sessionId = calculateSessionIdFromToken(token);
	const now = new Date();
	await db.insert(schema.playerSession).values({
		playerSessionId: sessionId,
		playerId: playerId,
		expiresAt: new Date(now.getTime() + SESSION_EXPIRATION_PERIOD),
	});
	return sessionId;
}

async function invalidatePlayerSession(sessionId: string) {
	await db
		.delete(schema.playerSession)
		.where(eq(schema.playerSession.playerSessionId, sessionId));
}

async function validatePlayerSessionToken(
	token: string,
): Promise<{ sessionId: string; playerId: string } | null> {
	const sessionId = calculateSessionIdFromToken(token);
	const [result] = await db
		.select({
			sessionId: schema.playerSession.playerSessionId,
			expiresAt: schema.playerSession.expiresAt,
			playerId: schema.player.playerId,
		})
		.from(schema.playerSession)
		.innerJoin(
			schema.player,
			eq(schema.playerSession.playerId, schema.player.playerId),
		)
		.where(eq(schema.playerSession.playerSessionId, sessionId));

	if (result == null) {
		return null;
	}

	const now = new Date();
	const sessionExpired = now.getTime() >= result.expiresAt.getTime();
	if (sessionExpired) {
		await invalidatePlayerSession(result.sessionId);
		return null;
	}

	const renewSession =
		now.getTime() >= result.expiresAt.getTime() - SESSION_RENEWAL_PERIOD;

	if (renewSession) {
		result.expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_PERIOD);
		await db
			.update(schema.playerSession)
			.set({ expiresAt: result.expiresAt })
			.where(eq(schema.playerSession.playerSessionId, result.sessionId));
	}

	return { sessionId: result.sessionId, playerId: result.playerId };
}
