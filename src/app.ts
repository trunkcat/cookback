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
		console.log(ctx.request.method, ctx.request.url.pathname);
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

const hostname = process.env.HOSTNAME;
const port = Number(process.env.PORT ?? 8080);
if (isNaN(port)) throw new Error("Invalid PORT specified");

console.log("Starting app at", `http://${hostname ?? "localhost"}:${port}`);
app.listen({ port, hostname: process.env.HOSTNAME });
