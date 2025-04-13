import { Router } from "@oak/oak";
import { and, eq } from "drizzle-orm";
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
import { parseBody } from "../../../utils.js";

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
			email: parsed.data.username,
			passwordHash: hashedPassword,
		})
		.returning({ playerId: schema.player.playerId });

	await db.insert(schema.playerStats).values({
		playerId: player.playerId,
		coins: 0,
		experiencePoints: 0,
		playerLevel: 1,
	});

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
			username: true,
			playerId: true,
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
				columns: {
					placeId: true,
				},
			},
			itemUpgrades: {
				columns: {
					itemId: true,
					level: true,
				},
			},
			levelGoalProgresses: {
				columns: {
					goalId: true,
					obtainedValue: true,
				},
			},
		},
	});

	if (player == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Player not found" };
		return;
	}

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: player };
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
