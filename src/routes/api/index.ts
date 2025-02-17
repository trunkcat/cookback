import { Router } from "@oak/oak";
import { locationsRouter } from "./locations.js";

export const apiRouter = new Router({ prefix: "/api" });

apiRouter.use(locationsRouter.routes());
apiRouter.use(locationsRouter.allowedMethods());
