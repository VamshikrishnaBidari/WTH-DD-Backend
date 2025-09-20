import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import {
  createPaymentHistory,
  getPaymentHistory,
} from "../controllers/payment.controller.ts";

const router = Router();

router.route("/create-payment-history").post(verifyJWT, createPaymentHistory);
router.route("/get-payment-history").post(verifyJWT, getPaymentHistory);

export default router;
