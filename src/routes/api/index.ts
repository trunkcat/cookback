import { Router } from "@oak/oak";
import dataRouter from "./data/index.js";
import managerRouter from "./manager/index.js";
import playerRouter from "./player/index.js";

const router = new Router({ prefix: "/api" });

router.use(async (ctx, next) => {
	ctx.response.headers.set("Content-Type", "application/json");
	// console.log("Cookies: " + await ctx.cookies.size);
	// for await (const cookie of ctx.cookies.entries()) {
	// 	console.log("\t-", cookie[0] + ":", cookie[1]);
	// }
	await next();
});

router.get("/healthcheck", async (ctx) => {
	ctx.response.status = 200;
	ctx.response.body = { ok: true };
	return;
});

export default router;

router.use(dataRouter.routes());
router.use(dataRouter.allowedMethods());

router.use(managerRouter.routes());
router.use(managerRouter.allowedMethods());

router.use(playerRouter.routes());
router.use(playerRouter.allowedMethods());
