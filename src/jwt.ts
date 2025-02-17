import { JWTPayload, jwtVerify, SignJWT } from "jose";

if (process.env.JWT_SECRET_SIGNATURE == null) {
	throw new Error("JWT_SECRET_SIGNATURE is not set");
}

const EXPIRY = "15d";
const SECRET_SIGNATURE = new TextEncoder().encode(
	process.env.JWT_SECRET_SIGNATURE,
);

export async function sign(payload: JWTPayload): Promise<string> {
	return await new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(EXPIRY)
		.sign(SECRET_SIGNATURE);
}

export async function verify(input: string): Promise<JWTPayload> {
	const result = await jwtVerify(input, SECRET_SIGNATURE, {
		algorithms: ["HS256"],
	});
	return result.payload;
}
