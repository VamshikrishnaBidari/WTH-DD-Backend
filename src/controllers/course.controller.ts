import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

// set schoolid here
const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      vehicle,
      type,
      schoolId,
      amount,
      classesTotal,
      expiresAt,
      installments,
      classStart,
      classDuration,
    } = req.body;
    console.log({
      userId,
      vehicle,
      type,
      schoolId,
      amount,
      classesTotal,
      expiresAt,
      installments,
      classStart,
      classDuration,
    });
    if (
      [userId, vehicle, type, schoolId].some((field) => field?.trim() === "")
    ) {
      return res.status(400).json({
        message: "Please fill all the fields",
        success: false,
      });
    }
    if (
      typeof classesTotal !== "number" ||
      !expiresAt ||
      typeof amount !== "number" ||
      typeof installments !== "boolean"
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all the fields", success: false });
    }

    if (type !== "two-wheeler" && type !== "four-wheeler") {
      return res.status(400).json({
        message: "type can be two-wheeler or four-wheeler",
        success: false,
      });
    }
    // type is two-wheeler , four-wheeler
    const course = await prisma.course.create({
      data: {
        userId,
        vehicle,
        type,
        amount,
        classesTotal,
        expiresAt,
        installments,
        classStart,
        classDuration,
        pendingAmount: amount,
      },
    });
    if (!course) {
      return res.status(400).json({
        message: "Course not created",
        success: false,
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        schoolId: schoolId,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "User not updated with schoolId",
        success: false,
      });
    }
    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany();
    return res.status(200).json({ success: true, data: courses || [] });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        user: true,
        teacher: {
          include: {
            school: {
              select: {
                location: true,
                name: true,
                id: true,
              },
            },
          },
        },
        history: true,
        order: true,
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.log("get course by id error", error);
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id, data } = req.body;

    const updatedCourse = await prisma.course.update({
      where: { id },
      data,
    });

    return res.status(200).json({ success: true, data: updatedCourse });
  } catch (error) {
    console.log("update course error", error);
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    await prisma.course.delete({
      where: { id },
    });

    return res
      .status(200)
      .json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

const getOrders = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.body;
    const orders = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        order: true,
      },
    });
    if (!orders) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

const classRating = async (req: Request, res: Response) => {
  const { courseId, rating, feedback } = req.body;
  if (!courseId || !rating || !feedback) {
    return res
      .status(400)
      .json({ success: false, message: "Please fill all the fields" });
  }
  if (
    rating! == "Poor" &&
    rating !== "Average" &&
    rating !== "Good" &&
    rating !== "Moderate" &&
    rating !== "Excellent"
  ) {
    return res.status(400).json({ success: false, message: "Invalid rating" });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const ratingRes = await tx.classHistory.create({
        data: {
          rating,
          feedback,
          course: {
            connect: {
              id: courseId,
            },
          },
        },
      });
      if (!ratingRes) {
        throw new Error("Rating not created");
      }
      const course = await tx.course.update({
        where: { id: courseId },
        data: {
          studentAttendence: {
            increment: 1,
          },
          teacherAttendence: {
            increment: 1,
          },
          classesTaken: {
            increment: 1,
          },
        },
      });
      if (!course) {
        throw new Error("Course not updated");
      }
    });
    return res
      .status(200)
      .json({ success: true, message: "Class rating updated successfully" });
  } catch (error) {
    let errorMessage = "Internal Server Error";

    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.log("class rating error", error);

    return res.status(500).json({
      message: errorMessage,
      success: false,
    });
  }
};

export {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getOrders,
  classRating,
};
