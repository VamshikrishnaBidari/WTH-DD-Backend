import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

const setHoliday = async (req: Request, res: Response) => {
  try {
    const { schoolId, holidaySlots, holiday } = req.body;
    if (!schoolId || !holidaySlots || !Array.isArray(holidaySlots)) {
      return res.status(400).json({
        message: "please provide schoolId and holidaySlots",
        success: false,
      });
    }
    if (
      ![
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ].includes(holiday)
    ) {
      return res
        .status(400)
        .json({ message: "please provide valid holiday", success: false });
    }
    await prisma.$transaction(async (tx) => {
      const existingSchool = await tx.drivingSchool.findUnique({
        where: { id: schoolId },
      });
      if (!existingSchool) {
        throw new Error("School not found");
      }
      // Check if the holiday already exists
      const school = await tx.drivingSchool.update({
        where: { id: schoolId },
        data: {
          Holiday: holiday,
        },
      });
      if (!school) {
        throw new Error("school not found");
      }

      const teachers = await tx.teacher.updateMany({
        where: { schoolId: schoolId },
        data: {
          Holiday: holiday,
        },
      });
      if (!teachers) {
        throw new Error("teachers not found");
      }

      const students = await tx.user.updateMany({
        where: { schoolId: schoolId },
        data: {
          Holiday: holiday,
        },
      });
      if (!students) {
        throw new Error("students not found");
      }

      const operators = await tx.operator.updateMany({
        where: { schoolId: schoolId },
        data: {
          Holiday: holiday,
        },
      });
      if (!operators) {
        throw new Error("operators not found");
      }

      const calendars = await tx.calendar.findMany({
        where: { schoolId },
      });

      for (const calendar of calendars) {
        await tx.calendar.update({
          where: { id: calendar.id },
          data: {
            holidaySlots: holidaySlots,
          },
        });
      }

      const userCalendars = await tx.weekCalendarUser.findMany({
        where: {
          user: {
            schoolId,
          },
        },
      });
      for (const calendar of userCalendars) {
        await tx.weekCalendarUser.update({
          where: { id: calendar.id },
          data: {
            holidaySlots: holidaySlots,
          },
        });
      }
    });
    return res
      .status(200)
      .json({ message: "Holiday set successfully", success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false, error });
  }
};

const removeHoliday = async () => {
  try {
    const result = await prisma.$transaction([
      prisma.drivingSchool.updateMany({ data: { Holiday: "None" } }),
      prisma.teacher.updateMany({ data: { Holiday: "None" } }),
      prisma.user.updateMany({ data: { Holiday: "None" } }),
      prisma.operator.updateMany({ data: { Holiday: "None" } }),
      prisma.calendar.updateMany({ data: { holidaySlots: [] } }),
      prisma.weekCalendarUser.updateMany({ data: { holidaySlots: [] } }),
    ]);

    return {
      success: true,
      message: "Holiday data removed from all entities",
      updatedCounts: {
        drivingSchools: result[0].count,
        teachers: result[1].count,
        users: result[2].count,
        operators: result[3].count,
        calendars: result[4].count,
        weekCalendarUsers: result[5].count,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to remove holiday",
      error,
    };
  }
};

export { setHoliday, removeHoliday };
