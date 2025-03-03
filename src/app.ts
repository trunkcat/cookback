import { Application } from "@oak/oak";
import { config } from "dotenv";
import { router } from "./routes/index.js";
config({ path: ".env" });

const app = new Application();

app.use(async (ctx, next) => {
	ctx.response.headers.set("Access-Control-Allow-Origin", "*");
	ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
	ctx.response.headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type,Authorization",
	);
	await next();
});

app.use(async (ctx, next) => {
	try {
		console.log(ctx.request.url.pathname);
		await next();
	} catch (error) {
		console.error(error);

		ctx.response.status = 500;
		ctx.response.headers.set("Content-Type", "application/json");
		ctx.response.body = { ok: false, message: "Internal Server Error" };
	}
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: 8080, hostname: "192.168.29.36" });
