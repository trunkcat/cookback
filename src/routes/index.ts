import { Router } from "@oak/oak";
import apiRouter from "./api/index.js";

export const router = new Router();

router.use(apiRouter.routes());
router.use(apiRouter.allowedMethods());
