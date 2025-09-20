import {
  addMessage,
  deleteMessage,
  getMsgsOfChat,
  updateMessage,
} from "../controllers/chat.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { Router } from "express";
const router = Router();

router.route("/send-message").post(verifyJWT, addMessage);
router.route("/update-message").post(verifyJWT, updateMessage);
router.route("/delete-message").post(verifyJWT, deleteMessage);
router.route("/get-msgs-of-chat").post(verifyJWT, getMsgsOfChat);

export default router;
