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
		await next();
	} catch (error) {
		ctx.response.status = 500;
		console.error(error);
	}
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: 8080 });
