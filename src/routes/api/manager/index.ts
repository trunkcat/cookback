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
import { db, schema, SUPERMANAGER_USERNAME } from "../../../database/index.js";
import {
	Manager,
	ManagerRole,
	ManagerSession,
} from "../../../database/schema-types.js";
import { parseBody } from "../../../utilities.js";
import placesRouter from "./places.js";

interface State {
	session: ManagerSession & {
		manager: Omit<Manager, "passwordHash">;
	};
}

const router = new Router<State>({ prefix: "/manager" });

const loginSchema = z.object({
	username: z.string().nonempty(),
	password: z.string().nonempty(),
});

const SESSION_COOKIE_NAME = "auth-session";

router.post("/login", async (ctx) => {
	const parsed = await parseBody(ctx, loginSchema);
	if (!parsed.ok) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid credentials" };
		return;
	}

	const role: ManagerRole = parsed.data.username === SUPERMANAGER_USERNAME ?
		"supermanager" :
		"manager";

	const [manager] = await db
		.select({
			managerId: schema.manager.managerId,
			passwordHash: schema.manager.passwordHash,
		})
		.from(schema.manager)
		.where(
			and(
				eq(schema.manager.username, parsed.data.username),
				eq(schema.manager.role, role),
			),
		);

	if (manager == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Manager not found" };
		return;
	}

	const isCorrect = await verifyPassword(
		manager.passwordHash,
		parsed.data.password,
	);
	if (!isCorrect) {
		ctx.response.status = 400;
		ctx.response.body = { ok: false, message: "Invalid credentials" };
		return;
	}

	const sessionToken = generateSessionToken();
	const { expiresAt } = await createManagerSession(
		sessionToken,
		manager.managerId,
	);

	ctx.response.status = 200;
	ctx.response.body = {
		ok: true,
		data: {
			sessionToken,
			expiresAt: expiresAt.toISOString(),
			role: role,
		},
	};
});

router.use(async (ctx, next) => {
	const sessionToken = await ctx.cookies.get(SESSION_COOKIE_NAME);
	console.log("Verifying session token: " + sessionToken);

	if (!sessionToken) {
		ctx.response.status = 401;
		ctx.response.body = { ok: false, message: "Authorization required" };
		return;
	}

	const result = await validateManagerSessionToken(sessionToken);
	if (result == null) {
		ctx.response.status = 401;
		ctx.response.body = { ok: false, message: "Unauthorized" };
		return;
	}

	ctx.state = { session: result };
	await next();
});

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

	const [existingManager] = await db
		.select({ managerId: schema.manager.managerId })
		.from(schema.manager)
		.where(eq(schema.manager.username, parsed.data.username));

	if (existingManager != null) {
		ctx.response.status = 400;
		ctx.response.body = {
			ok: false,
			message: "Manager with the same username already exists",
		};
		return;
	}

	const hashedPassword = await hashPassword(parsed.data.password);
	await db
		.insert(schema.manager)
		.values({
			username: parsed.data.username,
			email: parsed.data.email,
			passwordHash: hashedPassword,
			role: "manager",
		})
		.returning({ managerId: schema.manager.managerId });

	ctx.response.status = 200;
	ctx.response.body = { ok: true };
});

router.get("/session", async (ctx) => {
	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: ctx.state.session };
});

router.delete("/logout", async (ctx) => {
	const [session] = await db
		.delete(schema.managerSession)
		.where(
			and(
				eq(
					schema.managerSession.managerSessionId,
					ctx.state.session.managerSessionId,
				),
				eq(schema.managerSession.managerId, ctx.state.session.managerId),
			),
		)
		.returning({ id: schema.managerSession.managerSessionId });

	await ctx.cookies.delete(SESSION_COOKIE_NAME);

	if (session == null) {
		ctx.response.status = 404;
		ctx.response.body = { ok: false, message: "Session not found" };
		return;
	}

	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: true };
});

router.get("/", async (ctx) => {
	ctx.response.status = 200;
	ctx.response.body = { ok: true, data: ctx.state.session.manager };
});

router.get("/all-managers", async (ctx) => {
	const managers = await db.query.manager.findMany({
		where: eq(schema.manager.role, "manager"),
		columns: { passwordHash: false },
	});

	ctx.response.status = 200;
	ctx.response.body = managers;
});

export default router;

// AUTH FUNCTIONS

async function createManagerSession(
	token: string,
	managerId: string,
): Promise<{ sessionId: string; expiresAt: Date }> {
	const sessionId = calculateSessionIdFromToken(token);
	const now = new Date();
	const expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_PERIOD);
	await db.insert(schema.managerSession).values({
		managerSessionId: sessionId,
		managerId: managerId,
		expiresAt: expiresAt,
	});
	return { sessionId, expiresAt };
}

async function invalidateManagerSession(sessionId: string) {
	await db
		.delete(schema.managerSession)
		.where(eq(schema.managerSession.managerSessionId, sessionId));
}

async function validateManagerSessionToken(
	token: string,
): Promise<State["session"] | null> {
	const sessionId = calculateSessionIdFromToken(token);
	const session = await db.query.managerSession.findFirst({
		where: eq(schema.managerSession.managerSessionId, sessionId),
		with: { manager: { columns: { passwordHash: false } } },
	});

	if (session == null) {
		return null;
	}

	const now = new Date();
	const sessionExpired = now.getTime() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await invalidateManagerSession(sessionId);
		return null;
	}

	const renewSession =
		now.getTime() >= session.expiresAt.getTime() - SESSION_RENEWAL_PERIOD;

	if (renewSession) {
		session.expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_PERIOD);
		await db
			.update(schema.managerSession)
			.set({ expiresAt: session.expiresAt })
			.where(eq(schema.managerSession.managerSessionId, sessionId));
	}

	return session;
}

router.use(placesRouter.routes());
router.use(placesRouter.allowedMethods());
