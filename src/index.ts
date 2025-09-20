import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { CronJob } from "cron";
import helmet from "helmet";
// import csurf from "csurf";

// import routes
import userRouter from "./routes/user.routes.ts";
import teacherRouter from "./routes/teacher.routes.ts";
import drivingRouter from "./routes/driving.routes.ts";
import courseRouter from "./routes/course.routes.ts";
import orderRouter from "./routes/order.routes.ts";
import calendarRouter from "./routes/calendar.routes.ts";
import chatRouter from "./routes/chat.routes.ts";
import progressRouter from "./routes/progress.routes.ts";
import vehicleSyllabusRouter from "./routes/vehicleSyllabus.routes.ts";
import userCalendarRouter from "./routes/userCalendar.routes.ts";
import drivingSlotsRouter from "./routes/drivingSlots.routes.ts";
import operatorRouter from "./routes/operator.routes.ts";
import otpRouter from "./routes/otp.routes.ts";
import notificationRouter from "./routes/notification.route.ts";
import holidayRouter from "./routes/holiday.routes.ts";
import paymentRouter from "./routes/payment.routes.ts";

import { prisma } from "./utils/prismaClient.ts";
import { sendUserPushNotification } from "./utils/webPush.ts";
import { sendDailyClassNotifications } from "./controllers/user.controller.ts";
import {
  resetAddSlots,
  resetWeeklySlots,
} from "./controllers/calendar.controller.ts";
import { removeHoliday } from "./controllers/holiday.controller.ts";

dotenv.config({
  path: "../.env",
});

const app = express();
app.disable("x-powered-by");
app.use(helmet());

app.use(express.json({ limit: "19kb" }));
const allowedOrigins = process.env.CORS_ORIGIN!.split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true, limit: "19kb" }));
app.use(cookieParser());
// const csrfProtection = csurf({
//     cookie: {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//     },
// });
// app.use(csrfProtection);

// routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/teachers", teacherRouter);
app.use("/api/v1/driving", drivingRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/calendar", calendarRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/progress", progressRouter);
app.use("/api/v1/vehicleSyllabus", vehicleSyllabusRouter);
app.use("/api/v1/userCalendar", userCalendarRouter);
app.use("/api/v1/drivingSlots", drivingSlotsRouter);
app.use("/api/v1/operator", operatorRouter);
app.use("/api/v1/otp", otpRouter);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/holiday", holidayRouter);
app.use("/api/v1/payment", paymentRouter);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
});

const userSocketMap = new Map<string, string>();
const socketUserMap = new Map<string, string>();

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("register", (userId: string) => {
    if (!userId || typeof userId !== "string") {
      socket.emit("error", { message: "Invalid user ID" });
      return;
    }

    const existingSocketId = userSocketMap.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = io.sockets.sockets.get(existingSocketId);
      if (existingSocket) {
        console.log(
          `Disconnecting old socket ${existingSocketId} for user ${userId}`,
        );
        existingSocket.emit("force:disconnect", {
          reason: "New connection established",
          message: "You have been logged in from another device/tab",
        });
        existingSocket.disconnect(true);
      }
      socketUserMap.delete(existingSocketId);
    }
    userSocketMap.set(userId, socket.id);
    socketUserMap.set(socket.id, userId);

    console.log(`User ${userId} registered with socket ${socket.id}`);
    socket.emit("registered", { userId, socketId: socket.id });
  });

  socket.on("join:room", (room) => {
    socket.join(room);
    console.log("User joined room", room);
    socket.emit("joined:room", room);
  });

  socket.on("leave:room", (room) => {
    socket.leave(room);
    console.log("User left room", room);
    socket.emit("left:room", room);
  });

  socket.on("send:message", (data) => {
    io.to(data.to).emit("receive:message", data);
    console.log("Message sent to room", data.room);
  });

  socket.on("typing", (data) => {
    socket.to(data.room).emit("typing", data);
    console.log("User is typing in room", data.room);
  });

  socket.on("stop:typing", (data) => {
    socket.to(data.room).emit("stop:typing", data);
    console.log("User stopped typing in room", data.room);
  });

  socket.on("send:notification", async ({ toUserId, payload }) => {
    try {
      if (
        !toUserId ||
        !payload?.title ||
        !payload?.message ||
        !payload?.fromUserId
      ) {
        socket.emit("error", { message: "Invalid notification data" });
        return;
      }

      const notification = await prisma.notification.create({
        data: {
          fromUserId: payload.fromUserId,
          toUserId,
          title: payload.title,
          message: payload.message,
          isRead: false,
        },
      });

      // Send in real-time if recipient is online
      const recipientSocketId = userSocketMap.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("notification", {
          id: notification.id,
          fromUserId: payload.fromUserId,
          title: payload.title,
          message: payload.message,
          isRead: false,
        });
        console.log(`Real-time notification sent to user ${toUserId}`);
      }

      // Always send push notification (for both online and offline users)
      await sendUserPushNotification(toUserId, {
        title: payload.title,
        message: payload.message,
      });
    } catch (error) {
      console.error("Error in send:notification:", error);
      socket.emit("error", { message: "Failed to send notification" });
    }
  });

  socket.on("disconnect", () => {
    const userId = socketUserMap.get(socket.id);

    if (userId) {
      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`User ${userId} disconnected from socket ${socket.id}`);
    } else {
      console.log(`Unknown socket ${socket.id} disconnected`);
    }
  });
});

// function sendNotificationToUser(userId: string, payload: any) {
//     const socketId = userSocketMap.get(userId);
//     if (socketId) {
//         io.to(socketId).emit("notification", payload);
//         console.log(`Notification sent to user ${userId} via socket ${socketId}`);
//         return true;
//     } else {
//         console.log(`User ${userId} is not connected`);
//         return false;
//     }
// }

// function isUserOnline(userId: string): boolean {
//     return userSocketMap.has(userId);
// }

// function getUserSocketId(userId: string): string | undefined {
//     return userSocketMap.get(userId);
// }

// function getOnlineUserCount(): number {
//     return userSocketMap.size;
// }

// function getOnlineUsers(): string[] {
//     return Array.from(userSocketMap.keys());
// }

//every day 2am
new CronJob(
  "0 2 * * *",
  async () => {
    try {
      await sendDailyClassNotifications();
    } catch (error) {
      console.error("Error calling scheduled route:", error);
    }
  },
  null,
  true,
  "Asia/Kolkata",
);

// every sunday 8 pm
new CronJob(
  "0 20 * * 0",
  async () => {
    try {
      const result = await resetWeeklySlots();
      console.log("resetWeeklySlots result", result);
    } catch (error) {
      console.error("Error in sundayJob:", error);
    }
  },
  null,
  true,
  "Asia/Kolkata",
);

// every sunday 8 30 pm
new CronJob(
  "30 20 * * 0",
  async () => {
    try {
      const result = await removeHoliday();
      console.log("removeHoliday result", result);
    } catch (error) {
      console.error("Error in removeHolidayJob:", error);
    }
  },
  null,
  true,
  "Asia/Kolkata",
);

// every sunday 9 pm
new CronJob(
  "0 21 * * 0",
  async () => {
    try {
      const result = await resetAddSlots();
      console.log("resetAddSlots result", result);
    } catch (error) {
      console.error("Error in resetAddSlotsJob:", error);
    }
  },
  null,
  true,
  "Asia/Kolkata",
);

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

// export { sendNotificationToUser, isUserOnline, getUserSocketId };
