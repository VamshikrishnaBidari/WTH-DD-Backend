import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../utils/prismaClient.ts";
import { Request, Response } from "express";
import { uploadOnCloudinary } from "../utils/cloudinary.ts";

const generateAccessToken = (userId: string) => {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRY;
  if (!expiresIn || typeof expiresIn !== "string") {
    throw new Error("Invalid access token expiry");
  }
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || typeof secret !== "string") {
    throw new Error("Invalid access token secret");
  }
  return jwt.sign(
    { userId, role: "school" },
    secret as jwt.Secret,
    { expiresIn } as jwt.SignOptions,
  );
};

const generateRefreshToken = (userId: string) => {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRY;
  if (!expiresIn || typeof expiresIn !== "string") {
    throw new Error("Invalid access token expiry");
  }
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret || typeof secret !== "string") {
    throw new Error("Invalid access token secret");
  }

  return jwt.sign(
    { userId, role: "school" },
    secret as jwt.Secret,
    { expiresIn } as jwt.SignOptions,
  );
};

const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await prisma.drivingSchool.findUnique({
      where: { id: userId },
    });
    if (!user) throw new Error("User not found");
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    if (!accessToken || !refreshToken)
      throw new Error("failed to generate access and refresh token");
    user.refreshToken = refreshToken;
    await prisma.drivingSchool.update({
      where: { id: userId },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("generate access and refresh token error", error);
    throw new Error("failed to generate access and refresh token");
  }
};

const schoolRegister = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      location,
      phoneNumber,
      expertiseIn,
      yearsOfExperience,
      dateJoined,
    } = req.body;
    if (
      [name, email, password, phoneNumber].some((field) => field?.trim() === "")
    ) {
      return res.status(400).json({
        message: "Please fill all the fields",
        success: false,
      });
    }
    const years = Number(yearsOfExperience);
    if (isNaN(years)) {
      return res
        .status(400)
        .json({ error: "Invalid yearsOfExperience", success: false });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        success: false,
      });
    }
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      return res.status(400).json({
        message: "Avatar is required",
        success: false,
      });
    }
    const existingSchool = await prisma.drivingSchool.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
      },
    });
    if (existingSchool) {
      return res.status(400).json({
        message: "school with the given email already exists",
        success: false,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar || !avatar.secure_url) {
      return res.status(400).json({
        message: "Avatar upload failed",
        success: false,
      });
    }
    const school = await prisma.drivingSchool.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber,
        image: avatar.secure_url,
        location: location || "",
        expertiseIn: expertiseIn || "",
        yearsOfExperience: years || 0,
        dateJoined: dateJoined || "",
      },
    });
    if (!school) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      school?.id,
    );
    // const logedInUser = await User.findById(user._id).lean();
    const logedInUser = await prisma.drivingSchool.findUnique({
      where: {
        id: school.id,
      },
    });
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Secure only in production
      sameSite: "none" as const, // Prevent CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "User created successfully",
        success: true,
        logedInUser,
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

const schoolLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "email or password is required",
        success: false,
      });
    }
    // const user = await User.findOne({email}).select("_id password")
    const user = await prisma.drivingSchool.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User with given email is not registered",
        success: false,
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: "given password is incorrect",
        success: false,
      });
    }

    //generate access and refersh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user.id,
    );
    // const logedInUser=await User.findById(user._id).select("-password -refreshToken -isVerifiedStudent -role -coursesTaken -reviewsGiven").lean()

    const cookieOptions = {
      httpOnly: true,
      secure: true, // Secure only in production
      sameSite: "none" as const, // Prevent CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      })
      .json({
        user,
        accessToken,
        refreshToken,
        message: "user logged in successfully",
        success: true,
      });
  } catch (error) {
    console.log("user login error", error);
    return res.status(500).json({
      message: "Error while loggin in user",
      success: false,
    });
  }
};

const getTeachersWithStats = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        message: "School Id is required",
        success: false,
      });
    }

    // Find the driving school and include all teachers
    const schoolWithTeachers = await prisma.drivingSchool.findFirst({
      where: { id: schoolId },
      include: {
        teachers: {
          include: {
            reviews: true, // Include ratings array for each teacher
          },
        },
      },
    });

    if (!schoolWithTeachers) {
      return res.status(404).json({
        message: "Driving school not found",
        success: false,
      });
    }

    // Calculate start of current week (Sunday as first day of week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to end of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    // Calculate the statistics for each teacher
    const teachersWithStats = await Promise.all(
      schoolWithTeachers.teachers.map(async (teacher) => {
        // Find classes taken this week
        const coursesTaught = await prisma.course.findMany({
          where: {
            teacherId: teacher.id,
            history: {
              some: {
                createdAt: {
                  gte: startOfWeek,
                  lte: endOfWeek,
                },
              },
            },
          },
          include: {
            history: {
              where: {
                createdAt: {
                  gte: startOfWeek,
                  lte: endOfWeek,
                },
              },
            },
          },
        });

        // Calculate total classes taken this week
        const classesTakenThisWeek = coursesTaught.reduce((total, course) => {
          return total + course.history.length;
        }, 0);

        // Find courses with canceled classes
        const coursesWithCanceledClasses = await prisma.course.findMany({
          where: {
            teacherId: teacher.id,
            canceledClasses: {
              gt: 0,
            },
          },
          select: {
            id: true,
            canceledClasses: true,
          },
        });

        // Calculate total canceled classes (all-time)
        const totalCanceledClasses = coursesWithCanceledClasses.reduce(
          (total, course) => {
            return total + course.canceledClasses;
          },
          0,
        );

        // Calculate efficiency (taken / (taken + canceled))
        const totalClassesTaken = await prisma.course.findMany({
          where: {
            teacherId: teacher.id,
          },
          include: {
            history: true,
          },
        });

        const allTimeClassesTaken = totalClassesTaken.reduce(
          (total, course) => {
            return total + course.history.length;
          },
          0,
        );

        // Calculate efficiency percentage
        const totalClassesScheduled =
          allTimeClassesTaken + totalCanceledClasses;
        const efficiency =
          totalClassesScheduled > 0
            ? (allTimeClassesTaken / totalClassesScheduled) * 100
            : 100; // If no classes scheduled, efficiency is 100%

        // Calculate overall rating
        const totalRatings = teacher.reviews.length;
        const overallRating =
          totalRatings > 0
            ? teacher.reviews.reduce((sum, rating) => sum + rating.rating, 0) /
              totalRatings
            : 0;

        return {
          ...teacher,
          weeklyStats: {
            classesTakenThisWeek,
          },
          overallStats: {
            totalClassesTaken: allTimeClassesTaken,
            totalCanceledClasses,
            efficiency: parseFloat(efficiency.toFixed(2)), // Format to 2 decimal places
            overallRating: parseFloat(overallRating.toFixed(2)), // Format to 2 decimal places
          },
        };
      }),
    );

    return res.status(200).json({
      message: "Teachers fetched successfully with statistics",
      success: true,
      teachers: teachersWithStats,
    });
  } catch (error) {
    console.log("get teachers with stats error", error);
    return res.status(500).json({
      message: "Failed to fetch teachers with statistics",
      success: false,
    });
  }
};

const getSchool = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(404).json({
        message: "school not found",
        success: false,
      });
    }
    return res.status(200).json({
      user: req?.user,
      message: "school found successfully",
      success: true,
    });
  } catch (error) {
    console.log("get school error", error);
    return res.status(500).json({
      message: "failed to fetch school",
      success: false,
    });
  }
};

const refreshAccessToken = async (req: Request, res: Response) => {
  const incommingRefreshToken =
    req.cookies?.refreshToken || req?.body?.refreshToken;
  if (!incommingRefreshToken) {
    return res.status(401).json({
      message: "refresh token is required",
      success: false,
    });
  }
  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    );
    // const user=await User.findById(decodedToken?.id).select("_id refreshToken")
    const user = await prisma.drivingSchool.findUnique({
      where: {
        id: (decodedToken as jwt.JwtPayload)?.userId,
      },
      select: {
        id: true,
        refreshToken: true,
      },
    });
    if (!user) {
      return res.status(403).json({
        message: "user not found",
        success: false,
      });
    }
    if (incommingRefreshToken !== user.refreshToken) {
      return res.status(400).json({
        message: "refresh token is used or expired",
        success: false,
      });
    }
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "strict" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user.id,
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        accessToken,
        refreshToken,
        message: "Access token refreshed",
        success: true,
      });
  } catch (error) {
    console.log("refresh access token error", error);
    if (error instanceof Error) {
      if (error?.name === "TokenExpiredError") {
        return res.status(403).json({
          message: "Refresh token has expired",
          success: false,
        });
      }
    }
    return res.status(500).json({
      message: "Internal server error while refershing access token",
      success: false,
    });
  }
};

const schoolLogout = async (req: Request, res: Response) => {
  try {
    const userId = req?.user?.id;
    // await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    await prisma.drivingSchool.update({
      where: { id: userId },
      data: { refreshToken: undefined },
    });
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "strict" as const,
    };
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        message: "user logged out successfully",
        success: true,
      });
  } catch (error) {
    console.log("school logout error", error);
    return res.status(500).json({
      message: "failed to logout school",
      success: false,
    });
  }
};

const createSyllabus = async (req: Request, res: Response) => {
  const {
    courseType,
    price,
    classes,
    timePerSession,
    courseName,
    schoolId,
    LLamount,
    classesAmount,
    LicenseAmount,
    theorySessionsInfo,
    practicalSessionsInfo,
  } = req.body;
  try {
    await prisma.$transaction(async (tx) => {
      const vsyllabus = await tx.vSyllabus.create({
        data: {
          vehicle: courseType,
          schoolId: schoolId,
        },
      });

      const allSessions = [...theorySessionsInfo, ...practicalSessionsInfo];

      const vehicleSyllabusData = allSessions.map(
        (session: {
          classNumber: number;
          classTitle: string;
          description: string;
          keyPoints: string;
        }) => ({
          day: session.classNumber, // or session.day if you have day field
          title: session.classTitle,
          description: session.description,
          keyPoints: session.keyPoints ?? null, // optional
          syllabusId: vsyllabus.id,
        }),
      );

      await tx.vehicleSyllabus.createMany({
        data: vehicleSyllabusData,
      });

      const syllabus = await tx.syllabus.create({
        data: {
          vehicle: courseType,
          price,
          classes,
          timePeriod: timePerSession,
          description: courseName,
          schoolId,
          LLamount,
          classesAmount,
          LicenseAmount,
        },
      });
      if (!syllabus) {
        throw new Error("failed to create syllabus");
      }
    });
    return res.status(201).json({
      message: "Syllabus created successfully",
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

const getSyllabus = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    const syllabus = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
      include: {
        syllabus: true,
        vehicleSyllabus: true,
      },
    });
    if (!syllabus) {
      return res.status(404).json({
        message: "syllabus not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "syllabus fetched successfully",
      success: true,
      syllabus,
    });
  } catch (error) {
    console.log("get syllabus error", error);
    return res.status(500).json({
      message: "failed to fetch syllabus",
      success: false,
    });
  }
};

const getTeacherClassesThisWeek = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Calculate start of current week (Sunday as first day of week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to end of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    // Find all courses for teachers in this school where classes were taken this week
    const coursesTaught = await prisma.course.findMany({
      where: {
        teacher: {
          schoolId: schoolId,
        },
        history: {
          some: {
            createdAt: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
          },
        },
      },
      include: {
        history: {
          where: {
            createdAt: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
          },
        },
      },
    });

    // Calculate total classes taken this week across all teachers
    const totalClassesTakenThisWeek = coursesTaught.reduce((total, course) => {
      return total + course.history.length;
    }, 0);

    return res.status(200).json({
      success: true,
      totalClassesTakenThisWeek,
      schoolId,
    });
  } catch (error) {
    console.error("Error fetching all teachers classes this week:", error);
    return res.status(500).json({
      error: "Failed to fetch all teachers classes this week",
      success: false,
    });
  }
};

const getTeacherClassesThisMonth = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Calculate start of current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Calculate end of current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Find all courses for teachers in this school where classes were taken this month
    const coursesTaught = await prisma.course.findMany({
      where: {
        teacher: {
          schoolId: schoolId,
        },
        history: {
          some: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        },
      },
      include: {
        history: {
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        },
      },
    });

    // Calculate total classes taken this month across all teachers
    const totalClassesTakenThisMonth = coursesTaught.reduce((total, course) => {
      return total + course.history.length;
    }, 0);

    return res.status(200).json({
      success: true,
      totalClassesTakenThisMonth,
      schoolId,
    });
  } catch (error) {
    console.error("Error fetching all teachers classes this month:", error);
    return res.status(500).json({
      error: "Failed to fetch all teachers classes this month",
      success: false,
    });
  }
};

const getTeacherCanceledClassesThisWeek = async (
  req: Request,
  res: Response,
) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Calculate start of current week (Sunday as first day of week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to end of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch all courses for teachers in this school that were updated this week with canceled classes
    const courses = await prisma.course.findMany({
      where: {
        teacher: {
          schoolId: schoolId,
        },
        updatedAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        canceledClasses: {
          gt: 0,
        },
      },
      select: {
        id: true,
        canceledClasses: true,
      },
    });

    // Sum up all canceled classes this week across all teachers
    const totalCanceledClassesThisWeek = courses.reduce((total, course) => {
      return total + course.canceledClasses;
    }, 0);

    return res.status(200).json({
      success: true,
      totalCanceledClassesThisWeek,
      schoolId,
    });
  } catch (error) {
    console.error(
      "Error fetching all teachers canceled classes this week:",
      error,
    );
    return res.status(500).json({
      error: "Failed to fetch all teachers canceled classes this week",
      success: false,
    });
  }
};

const getTeacherCanceledClassesThisMonth = async (
  req: Request,
  res: Response,
) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Calculate start of current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Calculate end of current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Fetch all courses for teachers in this school that were updated this month with canceled classes
    const courses = await prisma.course.findMany({
      where: {
        teacher: {
          schoolId: schoolId,
        },
        updatedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        canceledClasses: {
          gt: 0,
        },
      },
      select: {
        id: true,
        canceledClasses: true,
      },
    });

    // Sum up all canceled classes this month across all teachers
    const totalCanceledClassesThisMonth = courses.reduce((total, course) => {
      return total + course.canceledClasses;
    }, 0);

    return res.status(200).json({
      success: true,
      totalCanceledClassesThisMonth,
      schoolId,
    });
  } catch (error) {
    console.error(
      "Error fetching all teachers canceled classes this month:",
      error,
    );
    return res.status(500).json({
      error: "Failed to fetch all teachers canceled classes this month",
      success: false,
    });
  }
};

const getStudentsEnrolledThisWeek = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Verify school exists
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ error: "School not found", success: false });
    }

    // Calculate start of current week (Sunday as first day of week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to end of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    // Count users who enrolled in this school this week
    const enrolledStudents = await prisma.user.findMany({
      where: {
        schoolId: schoolId,
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      select: {
        id: true,
      },
    });

    // Count orders created this week with status "success" for this school
    // We need to join with courses to get the teacher, then join to get the school
    const successfulOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        status: "success",
        course: {
          teacher: {
            schoolId: schoolId,
          },
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    return res.status(200).json({
      success: true,
      studentsEnrolledThisWeek: enrolledStudents.length,
      studentsWithSuccessfulOrdersThisWeek: successfulOrders.length,
    });
  } catch (error) {
    console.error("Error fetching students enrolled this week:", error);
    return res.status(500).json({
      error: "Failed to fetch students enrolled this week",
      success: false,
    });
  }
};

const getStudentsEnrolledThisMonth = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Verify school exists
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ error: "School not found", success: false });
    }

    // Calculate start of current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Calculate end of current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Count users who enrolled in this school this month
    const enrolledStudents = await prisma.user.findMany({
      where: {
        schoolId: schoolId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
      },
    });

    // Count orders created this month with status "success" for this school
    const successfulOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: "success",
        course: {
          teacher: {
            schoolId: schoolId,
          },
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    return res.status(200).json({
      success: true,
      studentsEnrolledThisMonth: enrolledStudents.length,
      studentsWithSuccessfulOrdersThisMonth: successfulOrders.length,
    });
  } catch (error) {
    console.error("Error fetching students enrolled this month:", error);
    return res.status(500).json({
      error: "Failed to fetch students enrolled this month",
      success: false,
    });
  }
};

const getCompletedCoursesThisWeek = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Verify school exists
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ error: "School not found", success: false });
    }

    // Calculate start of current week (Sunday as first day of week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to end of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    // Find courses that were marked as completed this week
    // We need to join with teacher to filter by school
    const completedCourses = await prisma.course.findMany({
      where: {
        completed: true,
        updatedAt: {
          // Assuming the updatedAt field is updated when completed flag changes
          gte: startOfWeek,
          lte: endOfWeek,
        },
        teacher: {
          schoolId: schoolId,
        },
      },
    });

    // Count by course type and vehicle
    const coursesByType: { [key: string]: number } = {};
    const coursesByVehicle: { [key: string]: number } = {};

    completedCourses.forEach((course) => {
      // Count by type
      if (coursesByType[course.type]) {
        coursesByType[course.type]++;
      } else {
        coursesByType[course.type] = 1;
      }

      // Count by vehicle
      if (coursesByVehicle[course.vehicle]) {
        coursesByVehicle[course.vehicle]++;
      } else {
        coursesByVehicle[course.vehicle] = 1;
      }
    });

    return res.status(200).json({
      totalCompletedCoursesThisWeek: completedCourses.length,
      completedCoursesByType: coursesByType,
      completedCoursesByVehicle: coursesByVehicle,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching completed courses this week:", error);
    return res.status(500).json({
      error: "Failed to fetch completed courses this week",
      success: false,
    });
  }
};

const getCompletedCoursesThisMonth = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Verify school exists
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ error: "School not found", success: false });
    }

    // Calculate start of current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Calculate end of current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Find courses that were marked as completed this month
    // We need to join with teacher to filter by school
    const completedCourses = await prisma.course.findMany({
      where: {
        completed: true,
        updatedAt: {
          // Assuming the updatedAt field is updated when completed flag changes
          gte: startOfMonth,
          lte: endOfMonth,
        },
        teacher: {
          schoolId: schoolId,
        },
      },
    });

    // Count by course type and vehicle
    const coursesByType: { [key: string]: number } = {};
    const coursesByVehicle: { [key: string]: number } = {};

    completedCourses.forEach((course) => {
      // Count by type
      if (coursesByType[course.type]) {
        coursesByType[course.type]++;
      } else {
        coursesByType[course.type] = 1;
      }

      // Count by vehicle
      if (coursesByVehicle[course.vehicle]) {
        coursesByVehicle[course.vehicle]++;
      } else {
        coursesByVehicle[course.vehicle] = 1;
      }
    });

    return res.status(200).json({
      success: true,
      totalCompletedCoursesThisMonth: completedCourses.length,
      completedCoursesByType: coursesByType,
      completedCoursesByVehicle: coursesByVehicle,
    });
  } catch (error) {
    console.error("Error fetching completed courses this month:", error);
    return res.status(500).json({
      error: "Failed to fetch completed courses this month",
      success: false,
    });
  }
};

const getCoordinators = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ error: "School ID is required", success: false });
    }

    // Verify school exists
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ error: "School not found", success: false });
    }

    // Find all coordinators for the school
    const coordinators = await prisma.operator.findMany({
      where: {
        schoolId: schoolId,
      },
    });

    return res.status(200).json({
      success: true,
      coordinators: coordinators || [],
    });
  } catch (error) {
    console.log("get coordinators error", error);
    return res.status(500).json({
      message: "failed to fetch coordinators",
      success: false,
    });
  }
};

const getStudents = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "school id is required",
        success: false,
      });
    }

    const students = await prisma.user.findMany({
      where: { schoolId },
      include: {
        courses: {
          include: {
            history: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });

    const ratingToScore: Record<string, number> = {
      Poor: 0,
      Average: 1,
      Good: 2,
      Moderate: 3,
      Excellent: 4,
    };

    const enrichedStudents = students.map((student) => {
      const updatedCourses = student.courses.map((course) => {
        const scores = course.history
          .map((h) => ratingToScore[h.rating])
          .filter((s) => s !== undefined);
        console.log("scores", scores);
        const avgRating =
          scores.length > 0
            ? scores.reduce((sum, val) => sum + val, 0) / scores.length
            : null;

        return {
          ...course,
          avgRating,
        };
      });

      return {
        ...student,
        courses: updatedCourses,
      };
    });

    return res.status(200).json({
      message: "students with course reviews fetched successfully",
      success: true,
      students: enrichedStudents,
    });
  } catch (error) {
    console.error("get students error", error);
    return res.status(500).json({
      message: "failed to fetch students",
      success: false,
    });
  }
};

const getFeedBack = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "school id is required",
        success: false,
      });
    }
    const feedback = await prisma.review.findMany({
      where: {
        teacher: {
          schoolId: schoolId,
        },
      },
      include: {
        teacher: true,
        user: true,
      },
    });

    return res.status(200).json({
      message: "feedback fetched successfully",
      success: true,
      feedback: feedback || [],
    });
  } catch (error) {
    console.log("get feedback error", error);
    return res.status(500).json({
      message: "failed to fetch feedback",
      success: false,
    });
  }
};

const getTeachers = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "School Id is required",
        success: false,
      });
    }

    // Find the driving school and include all teachers
    const schoolWithTeachers = await prisma.drivingSchool.findFirst({
      where: { id: schoolId },
      include: {
        teachers: {
          include: {
            reviews: true, // Include ratings array for each teacher
          },
        },
      },
    });

    if (!schoolWithTeachers) {
      return res.status(404).json({
        message: "Driving school not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "teachers found successfully",
      teachers: schoolWithTeachers,
      success: true,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Failed to fetch teachers",
      success: false,
    });
  }
};

const updateUserProfileImage = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const profileImageLocalPath = req.file?.path;
    if (!profileImageLocalPath) {
      return res.status(400).json({
        message: "profile image is missing",
        success: false,
      });
    }
    const image = await uploadOnCloudinary(profileImageLocalPath);
    if (!image || !image.secure_url) {
      return res.status(404).json({
        message: "image not found",
        success: false,
      });
    }
    if (!userId) {
      return res.status(400).json({
        message: "no user id",
        success: false,
      });
    }

    const user = await prisma.drivingSchool.update({
      where: {
        id: userId,
      },
      data: {
        image: image.secure_url,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "user not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "user updated successfully",
      success: true,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while updating profile image",
      success: false,
    });
  }
};

const updateSchool = async (req: Request, res: Response) => {
  try {
    const { id, data } = req.body;
    const school = await prisma.drivingSchool.update({
      where: {
        id: id,
      },
      data,
    });
    if (!school) {
      return res.status(400).json({
        message: "failed to update the school",
        success: false,
      });
    }
    return res.status(200).json({
      message: "updated school successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "internal server error while updating",
      success: false,
    });
  }
};

const updateSchoolImage = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const profileImageLocalPath = req.file?.path;
    if (!profileImageLocalPath) {
      return res.status(400).json({
        message: "profile image is missing",
        success: false,
      });
    }
    const image = await uploadOnCloudinary(profileImageLocalPath);
    if (!image || !image.secure_url) {
      return res.status(404).json({
        message: "image not found",
        success: false,
      });
    }
    if (!userId) {
      return res.status(400).json({
        message: "no user id",
        success: false,
      });
    }

    const user = await prisma.drivingSchool.update({
      where: {
        id: userId,
      },
      data: {
        schoolLogo: image.secure_url,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "user not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "user updated successfully",
      success: true,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while updating profile image",
      success: false,
    });
  }
};

const createCourseCombo = async (req: Request, res: Response) => {
  try {
    const { title, description, price, schoolId } = req.body;
    if (!title || !description || !price || !schoolId) {
      return res.status(400).json({
        message: "title, description, price and schoolId are required",
        success: false,
      });
    }
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });
    if (!school) {
      return res.status(404).json({
        message: "school not found",
        success: false,
      });
    }
    const courseCombo = await prisma.courseCombo.create({
      data: {
        title: title,
        description: description,
        price: price,
        schoolId: schoolId,
      },
    });
    if (!courseCombo) {
      return res.status(400).json({
        message: "failed to create course combo",
        success: false,
      });
    }
    return res.status(200).json({
      message: "course combo created successfully",
      success: true,
      courseCombo: courseCombo,
    });
  } catch (error) {
    console.log("create course combo error", error);
    return res.status(500).json({
      message: "failed to create course combo",
      success: false,
    });
  }
};

const getCourseCombo = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "school id is required",
        success: false,
      });
    }
    const courseCombo = await prisma.courseCombo.findMany({
      where: {
        schoolId: schoolId,
      },
    });
    if (!courseCombo) {
      return res.status(400).json({
        message: "failed to fetch course combo",
        success: false,
      });
    }
    return res.status(200).json({
      message: "course combo fetched successfully",
      success: true,
      courseCombo: courseCombo,
    });
  } catch (error) {
    console.log("get course combo error", error);
    return res.status(500).json({
      message: "failed to fetch course combo",
      success: false,
    });
  }
};

const createLicenseSyllabus = async (req: Request, res: Response) => {
  try {
    const { title, description, price, schoolId } = req.body;
    if (!title || !description || !price || !schoolId) {
      return res.status(400).json({
        message: "title, description, price and schoolId are required",
        success: false,
      });
    }
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });
    if (!school) {
      return res.status(404).json({
        message: "school not found",
        success: false,
      });
    }
    const licenseSyllabus = await prisma.licenseSyllabus.create({
      data: {
        title: title,
        description: description,
        price: price,
        schoolId: schoolId,
      },
    });
    if (!licenseSyllabus) {
      return res.status(400).json({
        message: "failed to create license syllabus",
        success: false,
      });
    }
    return res.status(200).json({
      message: "license syllabus created successfully",
      success: true,
    });
  } catch (error) {
    console.log("create license syllabus error", error);
    return res.status(500).json({
      message: "failed to create license syllabus",
      success: false,
    });
  }
};

const createLicenseSyllabusCombo = async (req: Request, res: Response) => {
  try {
    const { title, description, price, schoolId } = req.body;
    if (!title || !description || !price || !schoolId) {
      return res.status(400).json({
        message: "title, description, price and schoolId are required",
        success: false,
      });
    }
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });
    if (!school) {
      return res.status(404).json({
        message: "school not found",
        success: false,
      });
    }
    const licenseSyllabusCombo = await prisma.licenseSyllabusCombo.create({
      data: {
        title: title,
        description: description,
        price: price,
        schoolId: schoolId,
      },
    });
    if (!licenseSyllabusCombo) {
      return res.status(400).json({
        message: "failed to create license syllabus combo",
        success: false,
      });
    }
    return res.status(200).json({
      message: "license syllabus combo created successfully",
      success: true,
    });
  } catch (error) {
    console.log("create license syllabus combo error", error);
    return res.status(500).json({
      message: "failed to create license syllabus combo",
      success: false,
    });
  }
};

const getLicenseCombo = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "school id is required",
        success: false,
      });
    }
    const licenseCombo = await prisma.licenseSyllabusCombo.findMany({
      where: {
        schoolId: schoolId,
      },
    });
    if (!licenseCombo) {
      return res.status(400).json({
        message: "failed to fetch license combo",
        success: false,
      });
    }
    return res.status(200).json({
      message: "license combo fetched successfully",
      success: true,
      licenseCombo: licenseCombo,
    });
  } catch (error) {
    console.log("get license combo error", error);
    return res.status(500).json({
      message: "failed to fetch license combo",
      success: false,
    });
  }
};

const getLicenseSyllabus = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "school id is required",
        success: false,
      });
    }
    const licenseSyllabus = await prisma.licenseSyllabus.findMany({
      where: {
        schoolId: schoolId,
      },
    });
    if (!licenseSyllabus) {
      return res.status(400).json({
        message: "failed to fetch license syllabus",
        success: false,
      });
    }
    return res.status(200).json({
      message: "license syllabus fetched successfully",
      success: true,
      licenseSyllabus: licenseSyllabus,
    });
  } catch (error) {
    console.log("get license syllabus error", error);
    return res.status(500).json({
      message: "failed to fetch license syllabus",
      success: false,
    });
  }
};

const getLicenseSyllabusCombo = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "school id is required",
        success: false,
      });
    }
    const licenseSyllabusCombo = await prisma.licenseSyllabusCombo.findMany({
      where: {
        schoolId: schoolId,
      },
    });
    if (!licenseSyllabusCombo) {
      return res.status(400).json({
        message: "failed to fetch license syllabus combo",
        success: false,
      });
    }
    return res.status(200).json({
      message: "license syllabus combo fetched successfully",
      success: true,
      licenseSyllabusCombo: licenseSyllabusCombo,
    });
  } catch (error) {
    console.log("get license syllabus combo error", error);
    return res.status(500).json({
      message: "failed to fetch license syllabus combo",
      success: false,
    });
  }
};

export {
  schoolLogin,
  schoolLogout,
  schoolRegister,
  refreshAccessToken,
  getSchool,
  getTeachersWithStats,
  createSyllabus,
  getSyllabus,
  getTeacherClassesThisWeek,
  getTeacherCanceledClassesThisWeek,
  getTeacherCanceledClassesThisMonth,
  getStudentsEnrolledThisWeek,
  getStudentsEnrolledThisMonth,
  getTeacherClassesThisMonth,
  getCompletedCoursesThisMonth,
  getCompletedCoursesThisWeek,
  getCoordinators,
  getStudents,
  getFeedBack,
  getTeachers,
  updateUserProfileImage,
  updateSchool,
  updateSchoolImage,
  createCourseCombo,
  createLicenseSyllabus,
  createLicenseSyllabusCombo,
  getLicenseCombo,
  getLicenseSyllabus,
  getLicenseSyllabusCombo,
  getCourseCombo,
};
