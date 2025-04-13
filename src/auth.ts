import { hash, Options, verify, Version } from "@node-rs/argon2";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64url, encodeHexLowerCase } from "@oslojs/encoding";

// Took the following as reference, as they also migrated away from oslo/password to @node-rs/argon2.
// https://github.com/wasp-lang/wasp/blob/90651b082677e784eca6380e27bf912092942d1e/waspc/data/Generator/templates/sdk/wasp/auth/password.ts
// They followed the same configuration as oslo/password: https://github.com/pilcrowonpaper/oslo/blob/04d6c0522e24265106c10d82c3b490e97bac9ab0/src/password/argon2id.ts
const hashingOptions: Options = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1,
	version: Version.V0x13,
};

function normalizePassword(password: string): string {
	return password.normalize("NFKC");
}

export function hashPassword(password: string) {
	return hash(normalizePassword(password), hashingOptions);
}

export function verifyPassword(hash: string, password: string) {
	return verify(hash, normalizePassword(password), hashingOptions);
}

export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export function calculateSessionIdFromToken(token: string) {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}
