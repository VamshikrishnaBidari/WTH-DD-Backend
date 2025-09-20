import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";
// same in other controller
const addProgress = async (req: Request, res: Response) => {
  try {
    const { rating, feedback, courseId } = req.body;
    if (!rating || !feedback || !courseId) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    if (
      rating !== "Poor" &&
      rating !== "Good" &&
      rating !== "Excellent" &&
      rating !== "Average" &&
      rating !== "Moderate"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid rating" });
    }
    const progress = await prisma.classHistory.create({
      data: {
        rating,
        feedback,
        course: { connect: { id: courseId } },
      },
    });
    if (!progress) {
      return res
        .status(400)
        .json({ success: false, message: "Progress not added" });
    }
    return res
      .status(201)
      .json({ success: true, message: "Progress added successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

const getProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }
    const progress = await prisma.classHistory.findMany({
      where: { courseId: id },
      orderBy: {
        createdAt: "asc",
      },
    });
    return res.status(200).json({
      success: true,
      message: "Progress found",
      progress: progress || [],
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

export { addProgress, getProgress };
