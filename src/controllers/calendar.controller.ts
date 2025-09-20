import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

const createTeacherSlots = async (req: Request, res: Response) => {
  try {
    const { teacherId, schoolId, slots } = req.body;

    // Input validation
    if (!teacherId || typeof teacherId !== "string") {
      return res
        .status(400)
        .json({ message: "Invalid teacherId", success: false });
    }
    if (!schoolId || typeof schoolId !== "string") {
      return res
        .status(400)
        .json({ message: "Invalid schoolId", success: false });
    }
    if (!Array.isArray(slots) || slots.length === 0) {
      return res
        .status(400)
        .json({ message: "Slots must be a non-empty array", success: false });
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return res
        .status(404)
        .json({ message: "Teacher not found", success: false });
    }

    // Check if school exists
    const school = await prisma.drivingSchool.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return res
        .status(404)
        .json({ message: "School not found", success: false });
    }

    // Create a new Calendar entry
    const calendar = await prisma.calendar.create({
      data: {
        teacherId,
        schoolId,
        availableDates: slots,
        weeklySlots: {
          create: [],
        },
      },
      include: {
        weeklySlots: true,
      },
    });

    return res.status(201).json({
      message: "Calendar created successfully",
      calendar,
      success: true,
    });
  } catch (error) {
    console.error("Error creating calendar:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};

const getTeacherSlots = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res
        .status(400)
        .json({ message: "Invalid request", success: false });
    }
    const calendar = await prisma.calendar.findUnique({
      where: {
        teacherId: teacherId,
      },
      include: {
        bookedDates: true,
        weeklySlots: true,
      },
    });
    if (!calendar) {
      return res
        .status(404)
        .json({ message: "Calendar not found", success: false });
    }
    return res.status(200).json({
      message: "Calendar fetched successfully",
      success: true,
      calendar: calendar,
    });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};

const editTeacherSlots = async (req: Request, res: Response) => {
  const { teacherId, updates, courseId, userId } = req.body;
  if (
    !teacherId ||
    !updates ||
    !Array.isArray(updates) ||
    !courseId ||
    !userId
  ) {
    return res.status(400).json({ message: "Invalid request", success: false });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const calendar = await tx.calendar.findUnique({
        where: {
          teacherId: teacherId,
        },
        include: {
          bookedDates: true,
        },
      });
      if (!calendar) {
        throw new Error("Calendar not found");
      }
      for (const update of updates) {
        const existingBooking = calendar.bookedDates.some(
          (booking) => booking.slot === update,
        );

        if (!existingBooking) {
          await tx.bookedDate.create({
            data: {
              slot: update,
              courseId,
              calendarId: calendar.id,
              userId,
            },
          });
        }
      }

      // Update the availableDates array
      const updatedAvailableDates = [...calendar.availableDates, ...updates];
      await tx.calendar.update({
        where: {
          id: calendar.id,
        },
        data: {
          availableDates: updatedAvailableDates,
        },
      });
    });
    return res
      .status(200)
      .json({ message: "Calendar updated successfully", success: true });
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

const editCalendar = async (req: Request, res: Response) => {
  const { calendarId, weeklySlots, courseId } = req.body;
  if (!calendarId || !weeklySlots || !Array.isArray(weeklySlots) || !courseId) {
    return res.status(400).json({ message: "Invalid request", success: false });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const calendar = await tx.calendar.findUnique({
        where: {
          id: calendarId,
        },
        include: {
          weeklySlots: true,
        },
      });
      if (!calendar) {
        throw new Error("Calendar not found");
      }

      // Delete existing weekly slots
      await tx.weeklySlot.deleteMany({
        where: {
          calendarId: calendarId,
        },
      });

      // Create new weekly slots
      await tx.weeklySlot.createMany({
        data: weeklySlots.map((slot: string) => ({
          slot: slot,
          calendarId: calendarId,
          courseId,
        })),
      });
    });
    return res
      .status(200)
      .json({ message: "Calendar updated successfully", success: true });
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

const getCalendar = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.body;
    const calendar = await prisma.calendar.findUnique({
      where: {
        teacherId: teacherId,
      },
      include: {
        bookedDates: true,
        weeklySlots: true,
        canceledSlots: true,
        addClassSlots: true,
      },
    });
    if (!calendar) {
      return res
        .status(404)
        .json({ message: "Calendar not found", success: false });
    }
    return res.status(200).json({
      message: "Calendar fetched successfully",
      calendar,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};

const bookSlots = async (req: Request, res: Response) => {
  const { userId, courseIds, teacherId, slots } = req.body;

  if (
    !userId ||
    !teacherId ||
    !slots ||
    !Array.isArray(slots) ||
    !courseIds ||
    !Array.isArray(courseIds)
  ) {
    return res.status(400).json({ message: "Invalid request", success: false });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      const courses = await tx.course.findMany({
        where: { id: { in: courseIds } },
      });
      if (courses.length !== courseIds.length) {
        throw new Error("One or more courses not found");
      }

      const calendar = await tx.calendar.findUnique({
        where: { teacherId },
        include: { bookedDates: true },
      });
      if (!calendar) throw new Error("Teacher's calendar not found");

      const newAvailableDates = calendar.availableDates.filter(
        (slot) => !slots.includes(slot),
      );

      await tx.calendar.update({
        where: { id: calendar.id },
        data: {
          availableDates: newAvailableDates,
        },
      });

      for (const slot of slots) {
        if (!calendar.availableDates.includes(slot)) {
          throw new Error(`Slot ${slot} is not available`);
        }
      }

      await Promise.all(
        courseIds.map(async (courseId) => {
          await Promise.all(
            slots.map(async (slotToBook) => {
              await tx.bookedDate.create({
                data: {
                  slot: slotToBook,
                  courseId,
                  calendarId: calendar.id,
                  userId,
                },
              });

              await tx.weeklySlot.create({
                data: {
                  slot: slotToBook,
                  calendarId: calendar.id,
                  courseId,
                  userId,
                },
              });
            }),
          );

          await tx.course.update({
            where: { id: courseId },
            data: {
              teacherId,
            },
          });
        }),
      );

      const existing = await tx.weekCalendarUser.findUnique({
        where: { userId },
      });

      const mergedSlots = Array.from(
        new Set([...(existing?.slots ?? []), ...slots]),
      );

      await tx.weekCalendarUser.upsert({
        where: { userId },
        update: {
          slots: mergedSlots,
        },
        create: {
          userId,
          slots,
          originalSlots: slots,
        },
      });
    });

    return res.status(200).json({
      message: "Slots booked successfully",
      success: true,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";

    console.error("Booking Error:", error);

    return res.status(500).json({
      message: errorMessage,
      success: false,
    });
  }
};

const rescheduleUser = async (req: Request, res: Response) => {
  const { userId, courseId, teacherId, from, to, type } = req.body;

  if (!userId || !courseId || !teacherId || !from || !to || !type) {
    return res.status(400).json({ message: "Invalid request", success: false });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!course) throw new Error("Course not found");

      const teacher = await tx.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher) throw new Error("Teacher not found");

      const week = await tx.weekCalendarUser.findFirst({ where: { userId } });
      if (!week) throw new Error("Week calendar not found");

      const calendar = await tx.calendar.findUnique({
        where: { teacherId },
        include: {
          bookedDates: true,
          weeklySlots: true,
        },
      });
      if (!calendar) throw new Error("Teacher's calendar not found");

      const calendarSlotWithFrom = calendar.bookedDates.find(
        (booking) => booking.slot === from,
      );
      if (!calendarSlotWithFrom) throw new Error("Booked slot not found");

      const calendarSlotWithTo = calendar.availableDates.find(
        (slot) => slot === to,
      );
      if (!calendarSlotWithTo) throw new Error("Available slot not found");

      const isAlreadyBooked = calendar.bookedDates.some((b) => b.slot === to);
      if (isAlreadyBooked) throw new Error("Target slot is already booked");

      // Remove 'to' from availableDates
      const updatedCalendar = await tx.calendar.update({
        where: { id: calendar.id },
        data: {
          availableDates: {
            set: calendar.availableDates.filter((date) => date !== to),
          },
        },
        select: { availableDates: true },
      });

      if (updatedCalendar.availableDates.includes(to)) {
        throw new Error("Slot conflict. Reschedule failed.");
      }

      // Update booking
      if (type === "day") {
        await tx.bookedDate.update({
          where: { id: calendarSlotWithFrom.id },
          data: { slot: to },
        });

        await tx.calendar.update({
          where: { id: calendar.id },
          data: {
            availableDates: {
              set: [...new Set([...updatedCalendar.availableDates, from])],
            },
          },
        });
      }

      // Update user's week calendar
      await tx.weekCalendarUser.update({
        where: { id: week.id },
        data: {
          slots: {
            set: [...week.slots.filter((slot) => slot !== from), to],
          },
          ...(type === "day" && {
            originalSlots: {
              set: [...week.originalSlots.filter((slot) => slot !== from), to],
            },
          }),
        },
      });

      const existingWeeklySlot = calendar.weeklySlots.find(
        (ws) => ws.slot === from,
      );
      if (existingWeeklySlot) {
        await tx.weeklySlot.update({
          where: { id: existingWeeklySlot.id },
          data: { slot: to },
        });
      }

      await Promise.all([
        tx.teacher.update({
          where: { id: teacherId },
          data: { classesRescheduled: { increment: 1 } },
        }),
        tx.course.update({
          where: { id: courseId },
          data: { classesRescheduled: { increment: 1 } },
        }),
      ]);
    });

    return res.status(200).json({
      message: "Slot rescheduled successfully",
      success: true,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Rescheduling Error:", error);

    return res.status(500).json({
      message: errorMessage,
      success: false,
    });
  }
};

const cancelClass = async (req: Request, res: Response) => {
  const {
    userId,
    courseId,
    slot,
    teacherId,
    type = "week",
    isAddClassCancel = false,
    isTeacher = false,
  } = req.body;

  if (!userId || !courseId || !slot || !teacherId) {
    return res.status(400).json({ message: "Invalid request", success: false });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const userWeek = await tx.weekCalendarUser.findFirst({
        where: { userId },
      });
      if (!userWeek) throw new Error("Week calendar not found for user");

      if (isAddClassCancel) {
        await tx.weekCalendarUser.update({
          where: { id: userWeek.id },
          data: {
            addClassSlots: {
              set: userWeek.addClassSlots.filter((s: string) => s !== slot),
            },
          },
        });
      } else {
        if (userWeek.slots.includes(slot)) {
          await tx.weekCalendarUser.update({
            where: { id: userWeek.id },
            data: {
              slots: {
                set: userWeek.slots.filter((s: string) => s !== slot),
              },
              ...(type === "week" && {
                canceledSlots: { push: slot },
              }),
              ...(type === "day" && {
                originalSlots: {
                  set: userWeek.originalSlots.filter((s: string) => s !== slot),
                },
              }),
            },
          });
        }
      }

      const calendar = await tx.calendar.findFirst({
        where: { teacherId },
        include: {
          weeklySlots: true,
          bookedDates: true,
          addClassSlots: true,
        },
      });

      if (!calendar) throw new Error("Teacher's calendar not found");

      if (isAddClassCancel) {
        const addClassSlot = calendar.addClassSlots.find(
          (as) => as.slot === slot && as.courseId === courseId,
        );
        if (addClassSlot) {
          await tx.addClassSlot.delete({ where: { id: addClassSlot.id } });
        }
      } else {
        const weeklySlot = calendar.weeklySlots.find(
          (ws) => ws.slot === slot && ws.courseId === courseId,
        );
        if (weeklySlot) {
          await tx.weeklySlot.delete({ where: { id: weeklySlot.id } });
        }

        if (type === "day") {
          await tx.calendar.update({
            where: { id: calendar.id },
            data: {
              availableDates: {
                set: [...new Set([...calendar.availableDates, slot])],
              },
            },
          });

          await tx.bookedDate.deleteMany({
            where: { slot, courseId, userId },
          });
        }

        if (type === "week") {
          await tx.canceledSlot.create({
            data: {
              slot,
              courseId,
              userId,
              calendarId: calendar.id,
            },
          });
        }
      }
      await Promise.all([
        isTeacher &&
          tx.teacher.update({
            where: { id: teacherId },
            data: {
              canceledClasses: { increment: 1 },
            },
          }),
        tx.course.update({
          where: { id: courseId },
          data: {
            canceledClasses: { increment: 1 },
          },
        }),
      ]);
    });

    return res
      .status(200)
      .json({ message: "Class cancelled successfully", success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Cancel Class Error:", error);

    return res.status(500).json({
      message: errorMessage,
      success: false,
    });
  }
};

const resetWeeklySlots = async () => {
  try {
    await prisma.$transaction(async (tx) => {
      console.log("Starting weekly slots reset...");

      const calendars = await tx.calendar.findMany({
        include: {
          bookedDates: true,
          weeklySlots: true,
          canceledSlots: true,
        },
      });

      for (const calendar of calendars) {
        console.log(`calendar for teacher: ${calendar.teacherId}`);

        const bookedSlotStrings = calendar.bookedDates.map(
          (booked) => booked.slot,
        );
        const weeklySlotStrings = calendar.weeklySlots.map((ws) => ws.slot);

        // to slots
        const slotsToRemoveFromWeekly = calendar.weeklySlots.filter(
          (weekly) => !bookedSlotStrings.includes(weekly.slot),
        );

        for (const weeklySlot of slotsToRemoveFromWeekly) {
          // delete the rescheduled slot "to" from weekly slot
          await tx.weeklySlot.delete({
            where: {
              id: weeklySlot.id,
            },
          });
        }
        // reset available dates
        await tx.calendar.update({
          where: {
            id: calendar.id,
          },
          data: {
            availableDates: [
              ...calendar.availableDates,
              ...slotsToRemoveFromWeekly.map((slot) => slot.slot),
            ],
          },
        });

        // from slots
        const slotsToAddToWeekly = calendar.bookedDates.filter(
          (booked) => !weeklySlotStrings.includes(booked.slot),
        );

        for (const slotData of slotsToAddToWeekly) {
          await tx.weeklySlot.create({
            data: {
              slot: slotData.slot,
              courseId: slotData.courseId,
              userId: slotData.userId,
              calendarId: calendar.id,
            },
          });
        }

        // cancel slots - not needed as booked slot has all the details , so no need to worry
        // for (const canceledSlot of calendar.canceledSlots) {
        //   await tx.weeklySlot.create({
        //     data: {
        //       slot: canceledSlot.slot,
        //       courseId: canceledSlot.courseId,
        //       userId: canceledSlot.userId,
        //       calendarId: calendar.id,
        //     },
        //   });
        // }

        await tx.canceledSlot.deleteMany({
          where: {
            calendarId: calendar.id,
          },
        });

        console.log(
          `Removed ${slotsToRemoveFromWeekly.length} outdated slots, added ${slotsToAddToWeekly.length} rescheduled slots and ${calendar.canceledSlots.length} canceled slots for calendar ${calendar.id}`,
        );
      }

      const userWeekCalendars = await tx.weekCalendarUser.findMany();

      for (const userWeek of userWeekCalendars) {
        console.log(` week calendar for user: ${userWeek.userId}`);

        // to slots
        const slotsToRemove = userWeek.slots.filter(
          (slot) => !userWeek.originalSlots.includes(slot),
        );

        // from slots
        const rescheduledButNotInSlots = userWeek.originalSlots.filter(
          (slot) => !userWeek.slots.includes(slot),
        );

        // final slots
        let newSlots = userWeek.slots.filter(
          (slot) => !slotsToRemove.includes(slot),
        );
        newSlots = [
          ...newSlots,
          ...rescheduledButNotInSlots,
          ...userWeek.canceledSlots,
        ];

        const updates = {
          slots: {
            set: newSlots,
          },
          canceledSlots: {
            set: [],
          },
        };

        await tx.weekCalendarUser.update({
          where: {
            id: userWeek.id,
          },
          data: updates,
        });

        console.log(
          `Updated user ${userWeek.userId}: removed ${slotsToRemove.length} "to" slots, added ${rescheduledButNotInSlots.length} "from" slots and ${userWeek.canceledSlots.length} canceled slots back`,
        );
      }

      console.log("Weekly slots reset completed successfully");
    });
  } catch (error) {
    console.error("Error in weekly slots reset:", error);

    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
};

const addWeeklySlots = async (req: Request, res: Response) => {
  try {
    const { teacherId, courseId, slots, userId } = req.body;
    console.log("req.body", req.body);
    if (!teacherId || !courseId || !slots || !Array.isArray(slots) || !userId) {
      return res
        .status(400)
        .json({ message: "Invalid request", success: false });
    }

    await prisma.$transaction(async (tx) => {
      const calendar = await tx.calendar.findFirst({
        where: { teacherId: teacherId },
        include: {
          addClassSlots: true,
        },
      });
      if (!calendar) {
        throw new Error("no calendar found");
      }
      const course = await tx.course.findFirst({
        where: { id: courseId },
      });
      if (!course) {
        throw new Error("no course found");
      }

      const userWeek = await tx.weekCalendarUser.findFirst({
        where: { userId: userId },
      });
      if (!userWeek) {
        throw new Error("no user week found");
      }
      if (
        slots.length > course.weekClassLimit ||
        calendar.addClassSlots.length > course.weekClassLimit ||
        userWeek.addClassSlots.length > course.weekClassLimit
      ) {
        throw new Error("slots length exceeds course week class limit");
      }
      const updatedSlots = Array.from(
        new Set([...userWeek.addClassSlots, ...slots]),
      );

      await tx.weekCalendarUser.update({
        where: { id: userWeek.id },
        data: {
          addClassSlots: {
            set: updatedSlots,
          },
        },
      });
      // for(const slot of slots){
      //   await tx.weekCalendarUser.update({
      //     where:{id:userWeek.id},
      //     data:{
      //       addClassSlots:{
      //         push:slot
      //       }
      //     }
      //   })
      //   await tx.addClassSlot.create({
      //     data:{
      //       slot:slot,
      //       courseId:courseId,
      //       userId:userId,
      //       calendarId:calendar.id
      //     }
      //   })

      // }
      await Promise.all(
        slots.map((slot) =>
          tx.addClassSlot.create({
            data: {
              slot,
              courseId,
              userId,
              calendarId: calendar.id,
            },
          }),
        ),
      );
    });
    return res
      .status(200)
      .json({ message: "weekly slots added successfully", success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error adding slots", success: false, error });
  }
};

const addSlots = async (req: Request, res: Response) => {
  try {
    const { teacherId, courseId, slots, userId } = req.body;
    if (!teacherId || !courseId || !slots || !Array.isArray(slots) || !userId) {
      return res
        .status(400)
        .json({ message: "Invalid request", success: false });
    }

    await prisma.$transaction(async (tx) => {
      const calendar = await tx.calendar.findFirst({
        where: { teacherId },
        include: { bookedDates: true },
      });
      if (!calendar) throw new Error("No calendar found");

      const course = await tx.course.findFirst({ where: { id: courseId } });
      if (!course) throw new Error("No course found");

      const userWeek = await tx.weekCalendarUser.findFirst({
        where: { userId },
      });
      if (!userWeek) throw new Error("No user week found");

      const testSlots = slots.map(
        (slot: { day: string; slot: string }) => slot.slot,
      );

      if (
        slots.length > course.weekClassLimit ||
        userWeek.originalSlots.length + slots.length > course.weekClassLimit
      ) {
        throw new Error("Slots length exceeds course class limit");
      }

      const testSlotSet = new Set(testSlots);
      const filteredAvailableDates = calendar.availableDates.filter(
        (s: string) => !testSlotSet.has(s),
      );

      await tx.calendar.update({
        where: { id: calendar.id },
        data: {
          availableDates: filteredAvailableDates,
        },
      });

      await Promise.all(
        slots.map((slot) =>
          Promise.all([
            tx.weeklySlot.create({
              data: {
                slot: slot.slot,
                courseId,
                userId,
                calendarId: calendar.id,
              },
            }),
            tx.bookedDate.create({
              data: {
                slot: slot.slot,
                courseId,
                userId,
                calendarId: calendar.id,
              },
            }),
          ]),
        ),
      );

      const newSlotsSet = new Set([...userWeek.slots, ...testSlots]);
      const newOriginalSlotsSet = new Set([
        ...userWeek.originalSlots,
        ...testSlots,
      ]);

      await tx.weekCalendarUser.update({
        where: { id: userWeek.id },
        data: {
          slots: { set: Array.from(newSlotsSet) },
          originalSlots: { set: Array.from(newOriginalSlotsSet) },
        },
      });
    });

    return res
      .status(200)
      .json({ message: "Slots added successfully", success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Add Slots Error:", error);
    return res.status(500).json({ message: errorMessage, success: false });
  }
};

const resetAddSlots = async () => {
  try {
    await prisma.$transaction([
      prisma.weekCalendarUser.updateMany({
        data: { addClassSlots: [] },
      }),
      prisma.addClassSlot.deleteMany(),
    ]);

    return { message: "slots reset successfully", success: true };
  } catch (error) {
    return { message: "Error resetting slots", success: false, error };
  }
};

export {
  createTeacherSlots,
  getTeacherSlots,
  editTeacherSlots,
  editCalendar,
  getCalendar,
  bookSlots,
  rescheduleUser,
  cancelClass,
  resetWeeklySlots,
  addSlots,
  resetAddSlots,
  addWeeklySlots,
};
