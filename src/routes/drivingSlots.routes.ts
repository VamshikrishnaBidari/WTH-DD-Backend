import { Router } from "express";
const router = Router();

import {
  createDrivingSlot,
  getDrivingSlots,
} from "../controllers/drivingSlots.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

router.route("/").post(verifyJWT, createDrivingSlot);
router.route("/:schoolId").post(verifyJWT, getDrivingSlots);

export default router;
