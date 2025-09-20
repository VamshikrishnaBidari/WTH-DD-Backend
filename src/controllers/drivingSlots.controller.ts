import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

const createDrivingSlot = async (req: Request, res: Response) => {
  try {
    const { slots, schoolId } = req.body;
    if (!slots || (!Array.isArray(slots) && slots.length > 0)) {
      return res
        .status(400)
        .json({ message: "Slots are required", success: false });
    }
    if (!schoolId) {
      return res
        .status(400)
        .json({ message: "School ID is required", success: false });
    }
    // Check if the school exists
    const school = await prisma.drivingSchool.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      return res
        .status(404)
        .json({ message: "School not found", success: false });
    }
    const data = await prisma.slots.createMany({
      data: slots.map(
        (slot: { day: string; slotNumber: string; time: string }) => ({
          day: slot.day,
          slotNumber: slot.slotNumber,
          time: slot.time,
          schoolId: schoolId,
        }),
      ),
    });
    if (!data) {
      return res
        .status(500)
        .json({ message: "Error creating driving slots", success: false });
    }
    return res
      .status(201)
      .json({ message: "Driving slots created successfully", success: true });
  } catch (error) {
    console.error("Error creating driving slot:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getDrivingSlots = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    if (!schoolId) {
      return res
        .status(400)
        .json({ message: "School ID is required", success: false });
    }
    // Check if the school exists
    const school = await prisma.drivingSchool.findUnique({
      where: { id: schoolId },
      include: { slots: true },
    });
    if (!school) {
      return res
        .status(404)
        .json({ message: "School not found", success: false });
    }
    return res.status(200).json({
      slots: school.slots,
      success: true,
      message: "Driving slots fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching driving slots:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { createDrivingSlot, getDrivingSlots };
