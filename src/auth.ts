import { encodeBase64url, encodeHexLowerCase } from "@oslojs/encoding";
import { Argon2id } from "oslo/password";
import { db, schema } from "./database/index.js";
import { sha256 } from "@oslojs/crypto/sha2";
import {
	SESSION_EXPIRATION_PERIOD,
	SESSION_RENEW_PERIOD,
} from "./constants.js";
import { eq } from "drizzle-orm";

export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

const argon2 = new Argon2id();

export function createPasswordHash(password: string) {
	return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string) {
	return argon2.verify(hash, password);
}

export async function createSession(
	token: string,
	playerId: number,
): Promise<Omit<schema.PlayerSession, "createdAt" | "expiresAt">> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const now = new Date();
	const session: schema.PlayerSession = {
		id: sessionId,
		playerId: playerId,
		expiresAt: new Date(now.getTime() + SESSION_EXPIRATION_PERIOD),
		createdAt: now,
	};
	await db.insert(schema.playerSessions).values(session);
	return {
		id: sessionId,
		playerId: playerId,
	};
}

export async function invalidateSession(sessionId: string) {
	await db
		.delete(schema.playerSessions)
		.where(eq(schema.playerSessions.id, sessionId));
}

export async function validateSessionToken(
	token: string,
): Promise<{ sessionId: string; playerId: number } | null> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			sessionId: schema.playerSessions.id,
			expiresAt: schema.playerSessions.expiresAt,
			playerId: schema.players.playerId,
		})
		.from(schema.playerSessions)
		.innerJoin(
			schema.players,
			eq(schema.playerSessions.playerId, schema.players.playerId),
		)
		.where(eq(schema.playerSessions.id, sessionId));

	if (result == null) {
		return null;
	}

	const now = new Date();
	const sessionExpired = now.getTime() >= result.expiresAt.getTime();
	if (sessionExpired) {
		await invalidateSession(result.sessionId);
		return null;
	}

	const renewSession =
		now.getTime() >= result.expiresAt.getTime() - SESSION_RENEW_PERIOD;

	if (renewSession) {
		result.expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_PERIOD);
		await db
			.update(schema.playerSessions)
			.set({ expiresAt: result.expiresAt })
			.where(eq(schema.playerSessions.id, result.sessionId));
	}

	return { sessionId: result.sessionId, playerId: result.playerId };
}
