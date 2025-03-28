import { Router } from "@oak/oak";
import { locationsRouter } from "./locations.js";
import { parseBody } from "../../utils.js";
import { z } from "zod";
import { db, schema } from "../../database/index.js";
import { and, eq } from "drizzle-orm";
import {
	createPasswordHash,
	createSession,
	generateSessionToken,
	validateSessionToken,
	verifyPassword,
} from "../../auth.js";

interface State {
	sessionId: string;
	playerId: number;
}

export const apiRouter = new Router<State>({ prefix: "/api" });

apiRouter.use(async (ctx, next) => {
	ctx.response.headers.set("Content-Type", "application/json");
	await next();
});

apiRouter.get("/healthcheck", async (ctx) => {
	ctx.response.status = 200;
	ctx.response.body = { ok: true };
	return;
});

const postSchema = z.object({
	username: z.string().nonempty(),
	password: z.string().nonempty(),
});

apiRouter.post("/sign-in", async (ctx) => {
	const parsed = await parseBody(ctx, postSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid username or password" };
		return;
	}

	const [player] = await db
		.select({
			playerId: schema.players.playerId,
			passwordHash: schema.players.passwordHash,
		})
		.from(schema.players)
		.where(eq(schema.players.username, parsed.data.username));

	let playerId: number;

	if (player != null) {
		playerId = player.playerId;
		const isCorrect = await verifyPassword(
			player.passwordHash,
			parsed.data.password,
		);
		if (!isCorrect) {
			ctx.response.status = 400;
			ctx.response.body = {
				ok: false,
				message: "Invalid username or password",
			};
			return;
		}
	} else {
		const hashedPassword = await createPasswordHash(parsed.data.password);
		const [player] = await db
			.insert(schema.players)
			.values({
				username: parsed.data.username,
				email: parsed.data.username, // TODO: for now
				passwordHash: hashedPassword,
			})
			.returning({ playerId: schema.players.playerId });

		await db.insert(schema.playerStats).values({
			playerId: player.playerId,
			coins: 0,
			experiencePoints: 0,
			playerLevel: 0,
		});

		playerId = player.playerId;
	}

	const sessionToken = generateSessionToken();
	await createSession(sessionToken, playerId);

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: { sessionToken } };
});

// TODO: move this downwards and organize neatly
apiRouter.use(locationsRouter.routes());
apiRouter.use(locationsRouter.allowedMethods());

apiRouter.use(async (ctx, next) => {
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
		ctx.response.body = {
			ok: false,
			message: "Invalid authorization header",
		};
		return;
	}

	const sessionToken = authToken.slice(BEARER_PREFIX.length);
	const result = await validateSessionToken(sessionToken);
	if (result == null) {
		ctx.response.status = 401;
		ctx.response.body = { ok: false, message: "Unauthorized" };
		return;
	}

	ctx.state = {
		playerId: result.playerId,
		sessionId: result.sessionId,
	};

	await next();
});

apiRouter.delete("/sign-out", async (ctx) => {
	const [session] = await db
		.delete(schema.playerSessions)
		.where(
			and(
				eq(schema.playerSessions.id, ctx.state.sessionId),
				eq(schema.playerSessions.playerId, ctx.state.playerId),
			),
		)
		.returning({ id: schema.playerSessions.id });

	if (session == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Session not found" };
		return;
	}

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: true };
});

apiRouter.get("/player", async (ctx) => {
	const [player] = await db
		.select({
			id: schema.players.playerId,
			username: schema.players.username,
			stats: {
				playerLevel: schema.playerStats.playerLevel,
				coins: schema.playerStats.coins,
				experiencePoints: schema.playerStats.experiencePoints,
			},
		})
		.from(schema.players)
		.innerJoin(
			schema.playerStats,
			eq(schema.players.playerId, schema.playerStats.playerId),
		)
		.where(eq(schema.players.playerId, ctx.state.playerId));

	if (player == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Player not found" };
		return;
	}

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: player };
});
