import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import {
  createTeacherSlots,
  getTeacherSlots,
  editTeacherSlots,
  editCalendar,
  getCalendar,
  bookSlots,
  rescheduleUser,
  cancelClass,
  addSlots,
  addWeeklySlots,
} from "../controllers/calendar.controller.ts";
import {
  bookingRate,
  slotUpdateRate,
} from "../middlewares/rateLimit.middleware.ts";

const router = Router();

router
  .route("/createTeacherSlots")
  .post(verifyJWT, slotUpdateRate, createTeacherSlots);
router.route("/getTeacherSlots").post(verifyJWT, getTeacherSlots);
router
  .route("/editTeacherSlots")
  .post(verifyJWT, slotUpdateRate, editTeacherSlots);
router.route("/editCalendar").post(verifyJWT, slotUpdateRate, editCalendar);
router.route("/getCalendar").post(verifyJWT, getCalendar);
router.route("/book-slots").post(verifyJWT, bookingRate, bookSlots);
router.route("/rescheduleUser").post(verifyJWT, bookingRate, rescheduleUser);
router.route("/cancelUserClass").post(verifyJWT, bookingRate, cancelClass);
router.route("/add-slots").post(verifyJWT, slotUpdateRate, addSlots);
router
  .route("/add-weekly-slots")
  .post(verifyJWT, slotUpdateRate, addWeeklySlots);

export default router;
