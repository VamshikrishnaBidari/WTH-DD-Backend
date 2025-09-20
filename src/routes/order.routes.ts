import { Router } from "express";
import {
  createOrder,
  failPayment,
  verifyPayment,
} from "../controllers/order.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();
router.route("/create").post(verifyJWT, createOrder);
router.route("/verify").post(verifyJWT, verifyPayment);
router.route("/fail").post(verifyJWT, failPayment);
export default router;
