import { Router } from "express";

const router = Router();

import {
  getNotifications,
  getNotificationsSent,
  markAsRead,
  sendNotificationToAll,
} from "../controllers/notification.controller.ts";

router.route("/").post(getNotifications);
router.route("/sent").post(getNotificationsSent);
router.route("/markAsRead").post(markAsRead);
router.route("/sendAll").post(sendNotificationToAll);

export default router;
