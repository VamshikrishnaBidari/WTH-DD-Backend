import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import {
  createUserWeekCalendar,
  getUserWeekCalendar,
  updateUserWeekCalendar,
} from "../controllers/userCalendar.controller.ts";
import { bookingRate } from "../middlewares/rateLimit.middleware.ts";

const router = Router();

router
  .route("/create-week")
  .post(verifyJWT, bookingRate, createUserWeekCalendar);
router.route("/get-week").post(verifyJWT, getUserWeekCalendar);
router
  .route("/update-week")
  .post(verifyJWT, bookingRate, updateUserWeekCalendar);

export default router;
