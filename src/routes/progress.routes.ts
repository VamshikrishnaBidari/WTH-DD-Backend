import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import {
  addProgress,
  getProgress,
} from "../controllers/progress.controller.ts";
import { progressRate } from "../middlewares/rateLimit.middleware.ts";
const router = Router();

router.route("/create").post(verifyJWT, progressRate, addProgress);
router.route("/get").post(verifyJWT, getProgress);

export default router;
