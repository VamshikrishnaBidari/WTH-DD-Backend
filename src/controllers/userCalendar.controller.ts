import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

const createUserWeekCalendar = async (req: Request, res: Response) => {
  const { userId, slots } = req.body;
  if (!userId || !slots || !Array.isArray(slots)) {
    return res
      .status(400)
      .json({ message: "Missing required fields", success: false });
  }

  try {
    const userCalendar = await prisma.weekCalendarUser.create({
      data: {
        userId,
        slots,
      },
    });
    return res.status(200).json({
      message: "User weekly calendar created successfully",
      userCalendar,
      success: true,
    });
  } catch {
    return res.status(201).json({
      message: "Error fetching user calendar",
      success: false,
    });
  }
};

const getUserWeekCalendar = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res
      .status(400)
      .json({ message: "Missing required fields", success: false });
  }

  try {
    const userCalendar = await prisma.weekCalendarUser.findMany({
      where: {
        userId,
      },
    });
    return res.status(200).json({
      message: "User weekly calendar fetched successfully",
      userCalendar: userCalendar,
      success: true,
    });
  } catch {
    return res.status(201).json({
      message: "Error fetching user calendar",
      success: false,
    });
  }
};

const updateUserWeekCalendar = async (req: Request, res: Response) => {
  const { userId, slots }: { userId?: string; slots?: string[] } = req.body;

  // Validation
  if (!userId || !Array.isArray(slots)) {
    return res.status(400).json({
      message: "userId and slots[] are required",
      success: false,
    });
  }

  try {
    // Check if weekCalendarUser exists
    const existing = await prisma.weekCalendarUser.findUnique({
      where: { userId },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Week calendar for user not found",
        success: false,
      });
    }

    // Update the slots
    const updated = await prisma.weekCalendarUser.update({
      where: { userId },
      data: { slots },
    });

    return res.status(200).json({
      message: "User's weekly calendar updated successfully",
      weekCalendarUser: updated,
      success: true,
    });
  } catch (error) {
    console.error("Error updating weekCalendarUser:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

export { getUserWeekCalendar, createUserWeekCalendar, updateUserWeekCalendar };
