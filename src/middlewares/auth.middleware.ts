import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prismaClient.ts";
import { User, Teacher, DrivingSchool, Operator } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: (User | Teacher | DrivingSchool | Operator) & {
        role: "user" | "instructor" | "school" | "operator";
      };
    }
  }
}
export const verifyJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        message: "Token not found. Please log in.",
        success: false,
      });
    }

    if (typeof token !== "string") {
      return res.status(400).json({
        message: "Invalid token format.",
        success: false,
      });
    }

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
    ) as JwtPayload;

    if (!decodedToken?.userId) {
      return res.status(400).json({
        message: "Invalid access token.",
        success: false,
      });
    }

    let role: "user" | "instructor" | "school" | "operator" = "user";

    // Try finding a normal user
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      include: {
        courses: {
          include: {
            teacher: true,
          },
        },
        progress: true,
        reviews: true,
        llAppn: true,
        dlAppn: true,
        orders: true,
        school: true,
        branch: true,
      },
    });

    if (user) {
      role = "user";
      req.user = { ...user, role };
      return next();
    }

    // Try finding a teacher
    const teacher = await prisma.teacher.findUnique({
      where: { id: decodedToken.userId },
      include: {
        courses: true,
        availability: true,
        reviews: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: true,
      },
    });

    if (teacher) {
      role = "instructor";
      req.user = { ...teacher, role };
      return next();
    }

    // Try finding a driving school
    const school = await prisma.drivingSchool.findUnique({
      where: { id: decodedToken.userId },
      include: {
        syllabus: true,
        vehicleSyllabus: true,
        users: true,
        calendar: true,
        teachers: true,
        operator: true,
        branches: true,
        issues: true,
      },
    });

    if (school) {
      role = "school";
      console.log("Driving school found:", school);
      // Include the operator if exists
      req.user = { ...school, role };
      return next();
    }

    const operator = await prisma.operator.findUnique({
      where: { id: decodedToken.userId },
      include: {
        school: true,
        branch: true,
      },
    });
    if (operator) {
      role = "operator";
      req.user = { ...operator, role };
      return next();
    }

    return res.status(400).json({
      message: "User not found. Invalid token.",
      success: false,
    });
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(500).json({
      message: "Failed to verify JWT.",
      success: false,
    });
  }
};
