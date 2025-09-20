import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

const createPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { feeType, amount, userId, Date, description, paymentMethod } =
      req.body;
    if (!feeType || !amount || !userId || !Date || !paymentMethod) {
      return res
        .status(400)
        .json({ message: "All fields are required", success: false });
    }
    const paymentHistory = await prisma.paymentHistory.create({
      data: {
        feeType,
        amount,
        userId,
        Date,
        description: description ? description : "",
        paymentMethod,
      },
    });

    if (!paymentHistory) {
      return res
        .status(500)
        .json({ message: "Failed to create payment history", success: false });
    }

    return res.status(201).json({
      message: "Payment history created successfully",
      success: true,
      data: paymentHistory,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return res.status(500).json({
      message: "Internal server error while creating payment history",
      success: false,
    });
  }
};

const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ message: "User ID is required", success: false });
    }

    const paymentHistory = await prisma.paymentHistory.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!paymentHistory) {
      return res
        .status(404)
        .json({ message: "No payment history found", success: false });
    }
    return res.status(200).json({
      message: "Payment history fetched successfully",
      success: true,
      data: paymentHistory,
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return res.status(500).json({
      message: "Internal server error while fetching payment history",
      success: false,
    });
  }
};

export { createPaymentHistory, getPaymentHistory };
