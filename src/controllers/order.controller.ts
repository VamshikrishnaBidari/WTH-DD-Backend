import { Request, Response } from "express";
import Razorpay from "razorpay";
import { prisma } from "../utils/prismaClient.ts";
import crypto from "crypto";
const razorpay = new Razorpay({
  key_id: process.env.KEY_ID!,
  key_secret: process.env.KEY_SECRET!,
});

const createOrder = async (req: Request, res: Response) => {
  const { userId, courseId, amount, type } = req.body;
  if (!userId || !courseId || !amount) {
    return res
      .status(400)
      .json({ msg: "Please fill in all fields.", success: false });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        throw new Error("Course not found");
      }
      const pendingAmount = course.amount - amount;
      if (pendingAmount < 0) {
        throw new Error("Insufficient amount");
      }
      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `receipt_${courseId}_${userId}`,
        notes: {
          userId: userId,
          courseId: courseId,
        },
      });
      if (!order) {
        throw new Error("Failed to create order");
      }
      const newOrder = await tx.order.create({
        data: {
          userId: userId,
          courseId: courseId,
          amount: amount,
          razorpayId: order.id,
          type: type,
        },
      });
      if (!newOrder) {
        throw new Error("Failed to create order");
      }
      await tx.course.update({
        where: { id: courseId },
        data: {
          amount: pendingAmount,
        },
      });
    });
    return res
      .status(200)
      .json({ msg: "Order created successfully.", success: true });
  } catch (error) {
    let errorMessage = "Internal Server Error";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      message: errorMessage,
      success: false,
    });
  }
};

const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    if (!razorpay_order_id || razorpay_payment_id || razorpay_signature) {
      return res
        .status(400)
        .json({ msg: "Please fill in all fields.", success: false });
    }
    if (!process.env.KEY_SECRET) {
      return res.status(400).json({ msg: "no secret key", success: false });
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    if (expectedSignature === razorpay_signature) {
      const order = await prisma.order.update({
        where: { razorpayId: razorpay_order_id },
        data: { status: "success" },
      });
      if (!order) {
        return res
          .status(400)
          .json({ msg: "failed to update order", success: false });
      }
      return res
        .status(200)
        .json({ msg: "Payment verified successfully.", success: true });
    } else {
      const order = await prisma.order.update({
        where: { razorpayId: razorpay_order_id },
        data: { status: "failed" },
      });
      if (!order) {
        return res
          .status(400)
          .json({ msg: "failed to update order", success: false });
      }
      return res.status(200).json({
        msg: "Payment verification failed.",
        success: false,
        orderId: razorpay_order_id,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "Internal server error.", error, success: false });
  }
};

const failPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, amount } = req.body;
    const order = await prisma.order.findUnique({
      where: { razorpayId: orderId },
    });
    if (!order) {
      return res.status(400).json({ msg: "order not found", success: false });
    }
    const course = await prisma.course.findUnique({
      where: { id: order.courseId },
    });

    if (!course) {
      return res.status(400).json({ msg: "course not found", success: false });
    }
    const newCourse = await prisma.course.update({
      where: { id: order.courseId },
      data: { amount: course.amount - amount },
    });
    if (!newCourse) {
      return res
        .status(400)
        .json({ msg: "failed to update course", success: false });
    }
    return res
      .status(200)
      .json({ msg: "course updated successfully", success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "internal server error", error, success: false });
  }
};

export { createOrder, verifyPayment, failPayment };
