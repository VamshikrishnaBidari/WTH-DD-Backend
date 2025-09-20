import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

// note:  handled in driving controller , no need testing
const addVehicleSyllabus = async (req: Request, res: Response) => {
  const { schoolId, vehicle, syllabus } = req.body;

  if (!schoolId || !vehicle || !syllabus || !Array.isArray(syllabus)) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Find the correct vsyllabus entry for the given vehicle
      let vsyllabus = await tx.vSyllabus.findFirst({
        where: { schoolId, vehicle },
      });

      // If vsyllabus doesn't exist, create a new one
      if (!vsyllabus) {
        vsyllabus = await tx.vSyllabus.create({
          data: {
            vehicle,
            school: { connect: { id: schoolId } },
          },
        });
      }

      // Add new syllabus entries to the existing vsyllabus
      const newSyllabus = await tx.vehicleSyllabus.createMany({
        data: syllabus.map(
          (entry: { day: number; title: string; description: string }) => ({
            day: entry.day,
            title: entry.title,
            description: entry.description,
            syllabusId: vsyllabus.id,
          }),
        ),
      });
      if (!newSyllabus) {
        throw new Error("Failed to create syllabus");
      }
    });
    return res.status(200).json({
      message: "Syllabus added successfully",
      success: true,
    });
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

const getVehicleSyllabus = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }
    const syllabusData = await prisma.vSyllabus.findMany({
      where: { schoolId: id },
      include: {
        vehicleSyllabus: true, // Include all vehicle syllabus entries
      },
    });
    return res.status(200).json({
      success: true,
      message: "Syllabus data found",
      syllabusData: syllabusData || [],
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: (error as Error).message });
  }
};

export { addVehicleSyllabus, getVehicleSyllabus };
