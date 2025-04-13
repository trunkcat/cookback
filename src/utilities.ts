import { Context, Middleware } from "@oak/oak";
import { z, ZodError, ZodSchema } from "zod";
import { env } from "./env.js";

type ParseResult<T> =
	| { ok: true; data: T; message?: string }
	| { ok: false; data?: T; message: string };

export async function parseBody<T extends ZodSchema | undefined = undefined>(
	ctx: Context,
	schema?: T,
): Promise<ParseResult<T extends ZodSchema ? z.infer<T> : unknown>> {
	if (!ctx.request.body.has) {
		return { ok: false, message: "Expected body" };
	}
	if (ctx.request.headers.get("content-type") !== "application/json") {
		return { ok: false, message: "Expected content type to be JSON" };
	}

	try {
		const body = await ctx.request.body.json();
		const result = schema != null ? schema.parse(body) : body;
		return { ok: true, data: result };
	} catch (error) {
		if (error instanceof ZodError) {
			const message = error.issues.length == 0 ?
				"Invalid inputs" :
				error.issues[0].message;
			return { ok: false, message: message };
		}
		return { ok: false, message: "Invalid body" };
	}
}

export const cors: Middleware = async (ctx, next) => {
	if (ctx.request.headers.get("Origin") === env.FRONTEND_ORIGIN) {
		ctx.response.headers.set(
			"Access-Control-Allow-Origin",
			env.FRONTEND_ORIGIN,
		);
		ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
		ctx.response.headers.set(
			"Access-Control-Allow-Methods",
			"GET,POST,PATCH,PUT,DELETE,OPTIONS",
		);
		ctx.response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type,Authorization",
		);
	}

	if (ctx.request.method === "OPTIONS") {
		ctx.response.status = 204;
		return;
	}

	await next();
};
