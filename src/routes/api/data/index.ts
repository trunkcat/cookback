import { Router } from "@oak/oak";
import placeRouter from "./places.js";

const router = new Router({ prefix: "/data" });

router.use(placeRouter.routes());
router.use(placeRouter.allowedMethods());

export default router;
