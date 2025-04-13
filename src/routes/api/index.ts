import { Router } from "@oak/oak";
import dataRouter from "./data/index.js";
import managerRouter from "./manager/index.js";
import playerRouter from "./player/index.js";

export const apiRouter = new Router({ prefix: "/api" });

apiRouter.use(async (ctx, next) => {
	ctx.response.headers.set("Content-Type", "application/json");
	for await (const cookie of ctx.cookies.entries()) {
		console.log(cookie[0], cookie[1]);
	}
	await next();
});

apiRouter.get("/healthcheck", async (ctx) => {
	ctx.response.status = 200;
	ctx.response.body = { ok: true };
	return;
});

apiRouter.use(dataRouter.routes());
apiRouter.use(dataRouter.allowedMethods());

apiRouter.use(managerRouter.routes());
apiRouter.use(managerRouter.allowedMethods());

apiRouter.use(playerRouter.routes());
apiRouter.use(playerRouter.allowedMethods());
