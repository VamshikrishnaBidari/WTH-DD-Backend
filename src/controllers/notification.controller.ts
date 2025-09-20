import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const notifications = await prisma.notification.findMany({
      where: {
        toUserId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.status(200).json({
      message: "Notifications fetched successfully",
      success: true,
      notifications: notifications || [],
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Internal Server Error while fetching user notification",
      success: false,
    });
  }
};

const getNotificationsSent = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const notifications = await prisma.notification.findMany({
      where: {
        fromUserId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.status(200).json({
      message: "Notifications fetched successfully",
      success: true,
      notifications: notifications || [],
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Internal Server Error while fetching user notification",
      success: false,
    });
  }
};

const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.body;
    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });
    return res.status(200).json({
      message: "Notification marked as read successfully",
      success: true,
      notification: notification,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Internal Server Error while marking notification as read",
      success: false,
    });
  }
};

const sendNotificationToAll = async (req: Request, res: Response) => {
  try {
    const { schoolId, message, title } = req.body;
    if (!schoolId || !message || !title) {
      return res.status(400).json({
        message: "Invalid request",
        success: false,
      });
    }
    await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: {
          schoolId: schoolId,
        },
      });
      for (const user of users) {
        await tx.notification.create({
          data: {
            fromUserId: schoolId,
            toUserId: user.id,
            message: message,
            title: title,
            isRead: false,
          },
        });
      }
      const instructors = await tx.teacher.findMany({
        where: {
          schoolId: schoolId,
        },
      });
      for (const instructor of instructors) {
        await tx.notification.create({
          data: {
            fromUserId: schoolId,
            toUserId: instructor.id,
            message: message,
            title: title,
            isRead: false,
          },
        });
      }
    });
    return res.status(200).json({
      message: "Notification sent successfully",
      success: true,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Internal Server Error while sending notification",
      success: false,
    });
  }
};

export {
  getNotifications,
  getNotificationsSent,
  markAsRead,
  sendNotificationToAll,
};
