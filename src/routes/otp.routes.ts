import { Router } from "express";
import { sendOTP, verifyOTP } from "../controllers/otp.controller.ts";
import { otpRate, otpVerifyRate } from "../middlewares/rateLimit.middleware.ts";

const router = Router();

router.route("/send-otp").post(otpRate, sendOTP);
router.route("/verify-otp").post(otpVerifyRate, verifyOTP);

export default router;
