import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../utils/prismaClient.ts";
import { Request, Response } from "express";
import { uploadOnCloudinary } from "../utils/cloudinary.ts";
import transporter from "../utils/email.ts";

// TODO:  1. DETAILED REVIEW OF TOKENS AND ITS FLOW (AT LAST)

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
    { userId, role: "operator" },
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
    { userId, role: "operator" },
    secret as jwt.Secret,
    { expiresIn } as jwt.SignOptions,
  );
};

const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await prisma.operator.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    if (!accessToken || !refreshToken)
      throw new Error("failed to generate access and refresh token");
    user.refreshToken = refreshToken;
    await prisma.operator.update({
      where: { id: userId },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("generate access and refresh token error", error);
    throw new Error("failed to generate access and refresh token");
  }
};

const operatorSignUp = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      operatorId,
      expertiseIn,
      workingDays,
      workingHours,
      schoolId,
      experience,
    } = req.body;
    if (
      [
        name,
        email,
        password,
        phoneNumber,
        operatorId,
        expertiseIn,
        workingDays,
        workingHours,
        schoolId,
      ].some((field) => field?.trim() === "")
    ) {
      return res.status(400).json({
        message: "Please fill all the fields",
        success: false,
      });
    }

    // validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        success: false,
      });
    }

    const existingUser = await prisma.operator.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });
    if (existingUser) {
      return res.status(400).json({
        message: "User with the given email already exists",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const school = await prisma.drivingSchool.findFirst({
      where: {
        id: schoolId,
      },
    });
    if (!school) {
      return res.status(400).json({
        message: "school not found",
        success: false,
      });
    }

    const user = await prisma.operator.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber,
        operatorId,
        expertiseIn,
        workingDays,
        workingHours,
        schoolId,
        experience: Number(experience) || 0,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }

    const logedInUser = await prisma.operator.findUnique({
      where: {
        id: user.id,
      },
    });

    return res.status(200).json({
      message: "User created successfully",
      success: true,
      logedInUser,
    });
  } catch (error) {
    console.log("user signup error", error);
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

const operatorLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "email or password is required",
        success: false,
      });
    }
    // const user = await User.findOne({email}).select("_id password")
    const user = await prisma.operator.findUnique({
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

const changeOperatorPassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Old and new passwords are required",
        success: false,
      });
    }
    // const user=await User.findById(req.user._id).select("_id password")
    const user = await prisma.operator.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        password: true,
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "old password is incorrect",
        success: false,
      });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.operator.update({
      where: { id: req.user?.id },
      data: { password: hashedNewPassword },
    });
    return res.status(200).json({
      message: "user password changed successfully",
      success: true,
    });
  } catch (error) {
    console.log("change user password error", error);
    return res.status(500).json({
      message: "failed to change user password",
      success: false,
    });
  }
};

const getCurrentOperator = async (req: Request, res: Response) => {
  // get name,id,email,phone,insta,gender,pic
  try {
    if (!req.user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    return res.status(200).json({
      user: req?.user,
      message: "user found successfully",
      success: true,
    });
  } catch (error) {
    console.log("get current user error", error);
    return res.status(500).json({
      message: "failed to get current user",
      success: false,
    });
  }
};

const operatorLogout = async (req: Request, res: Response) => {
  try {
    await prisma.operator.update({
      where: { id: req.user?.id },
      data: { refreshToken: null },
    });
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Secure only in production
      sameSite: "none" as const, // Prevent CSRF
    };
    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json({
        message: "user logged out successfully",
        success: true,
      });
  } catch (error) {
    console.log("user logout error", error);
    return res.status(500).json({
      message: "failed to logout user",
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
    const user = await prisma.operator.findUnique({
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

const getStudentsForLicensing = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;

    // Validate input
    if (!schoolId) {
      return res.status(400).json({
        message: "School ID is required",
        success: false,
      });
    }

    // Fetch students with filtering directly in the database query
    const filteredStudents = await prisma.user.findMany({
      where: {
        schoolId: schoolId,
        NOT: {
          License: "Completed", // Exclude where License === Completed
        },
      },
      include: {
        courses: true,
        progress: true,
        llAppn: true,
        dlAppn: true,
      },
    });

    // Check if no students are found
    if (!filteredStudents || filteredStudents.length === 0) {
      return res.status(404).json({
        message: "No students found",
        success: false,
      });
    }

    // Return the filtered students
    return res.status(200).json({
      message: "Students fetched successfully",
      success: true,
      filteredStudents,
    });
  } catch (error) {
    console.error("Get students error:", error);
    return res.status(500).json({
      message: "Failed to fetch students",
      success: false,
    });
  }
};

const getAllStudents = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({
        message: "school id is required",
        success: false,
      });
    }
    const students = await prisma.user.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        courses: true,
      },
    });
    if (!students || students.length === 0) {
      return res.status(404).json({
        message: "no students found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "students fetched successfully",
      success: true,
      students,
    });
  } catch (error) {
    console.log("get students error", error);
    return res.status(500).json({
      message: "failed to fetch students",
      success: false,
    });
  }
};

const verifyDoc = async (req: Request, res: Response) => {
  try {
    const { userId, docSubmission } = req.body;
    if (!userId || !docSubmission) {
      return res.status(400).json({
        message: "userId and docSubmission are required",
        success: false,
      });
    }
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        progress: {
          select: {
            documentVerification: true,
          },
        },
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "user not found",
        success: false,
      });
    }
    if (user.progress?.documentVerification === "done") {
      return res.status(400).json({
        message: "docSubmission is already verified",
        success: false,
      });
    }
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        Document: "Completed",
        progress: {
          update: {
            documentVerification: "done",
          },
        },
      },
    });
    if (!updatedUser) {
      return res.status(500).json({
        message: "failed to update user",
        success: false,
      });
    }
    return res.status(200).json({
      message: "user docSubmission updated successfully",
      success: true,
    });
  } catch (error) {
    console.log("verify doc error", error);
    return res.status(500).json({
      message: "failed to verify doc",
      success: false,
    });
  }
};

const llAppnUpdate = async (req: Request, res: Response) => {
  const { userId, llAppnData } = req.body;

  // Validate input
  if (!userId || !llAppnData) {
    return res.status(400).json({
      message: "userId and llAppnData are required",
      success: false,
    });
  }

  // Check if the user exists
  try {
    await prisma.$transaction(async (tx) => {
      const student = await tx.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          llAppn: true, // Include the related LLAppn record
        },
      });

      if (!student) {
        throw new Error("User not found");
      }

      // Upsert: Create new or update existing LLAppn
      if (student.llAppn) {
        // Update existing LLAppn record
        await tx.lLAppn.update({
          where: {
            id: student.llAppn.id,
          },
          data: llAppnData,
        });
      } else {
        // Create a new LLAppn record
        await tx.lLAppn.create({
          data: {
            userId: userId,
            ...llAppnData,
          },
        });
      }

      // Conditionally update llTestBooking based on testDate and testTime presence
      const hasTestBookingData = llAppnData.testDate && llAppnData.testTime;

      await tx.licenseProcess.update({
        where: {
          userId: userId,
        },
        data: {
          llApplication: "done",
          llTestBooking: hasTestBookingData ? "done" : "pending",
        },
      });
    });

    return res.status(200).json({
      message: "LL application updated successfully",
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

const llResultUpdate = async (req: Request, res: Response) => {
  const { userId, llTestResult, operatorId } = req.body;

  // Validate input
  if (!userId || !llTestResult || !operatorId) {
    return res.status(400).json({
      message: "userId, llTestResult, and operatorId are required",
      success: false,
    });
  }

  try {
    // Check if the user exists
    await prisma.$transaction(async (tx) => {
      const student = await tx.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          llAppn: true, // Include the related LLAppn record
        },
      });

      if (!student) {
        throw new Error("User not found");
      }

      // Check if LLAppn already exists
      if (!student.llAppn) {
        throw new Error("LLAppn not found");
      }

      // Update the LLAppn record with the result
      await tx.lLAppn.update({
        where: {
          id: student.llAppn.id,
        },
        data: {
          testResult: llTestResult,
          llPdfUrl: null, // Optional field for PDF URL
        },
      });

      await tx.licenseProcess.update({
        where: {
          userId: userId,
        },
        data: {
          llTestDay: "done", // means LL test result is pass
        },
      });

      const updatedStudent = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          LL: "Completed", // Update the LL field to "Completed"
        },
      });

      await tx.operator.update({
        where: {
          id: operatorId,
        },
        data: {
          LLcount: {
            increment: 1, // Increment LLcount by 1
          },
        },
      });

      if (updatedStudent.LL === "Completed") {
        const existingLog = await tx.operatorAssistanceLog.findUnique({
          where: {
            operatorId_studentId: {
              // Default name for @@unique([operatorId, studentId])
              operatorId: operatorId,
              studentId: userId,
            },
          },
        });

        if (!existingLog) {
          await tx.operatorAssistanceLog.create({
            data: {
              operatorId: operatorId,
              studentId: userId,
            },
          });
          await tx.operator.update({
            where: { id: operatorId },
            data: {
              studentsCount: { increment: 1 },
            },
          });
        }
      }
    });

    return res.status(200).json({
      message: "LL test result updated successfully",
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

const dlAppnUpdate = async (req: Request, res: Response) => {
  const { userId, dlAppnData } = req.body;

  // Validate input
  if (!userId || !dlAppnData) {
    return res.status(400).json({
      message: "userId and dlAppnData are required",
      success: false,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Check if the user exists
      const student = await tx.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          dlAppn: true, // Include the related DLAppn record
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Transform dlnumber to oldDlnumber before saving
      const transformedDlAppnData = {
        ...dlAppnData,
        oldDlnumber: dlAppnData.dlnumber, // Map dlnumber to oldDlnumber
      };
      
      // Remove dlnumber from the data since it doesn't exist in schema
      delete transformedDlAppnData.dlnumber;


      // Upsert: Create new or update existing DLAppn
      if (student.dlAppn) {
        // Update existing DLAppn record
        await tx.dLAppn.update({
          where: {
            id: student.dlAppn.id,
          },
          data: transformedDlAppnData,
        });
      } else {
        // Create a new DLAppn record
        await tx.dLAppn.create({
          data: {
            userId: userId,
            ...transformedDlAppnData,
          },
        });
      }

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          learnersLicense: dlAppnData.llnumber,
        },
      });

      // Conditionally update dlTestBooking based on testDate and testTime presence
      const hasTestBookingData = dlAppnData.testDate && dlAppnData.testTime;

      await tx.licenseProcess.update({
        where: {
          userId: userId,
        },
        data: {
          dlApplication: "done", // Update the DL application status
          dlTestBooking: hasTestBookingData ? "done" : "pending",
        },
      });
    });

    return res.status(200).json({
      message: "DL application updated successfully",
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

const dlResultUpdate = async (req: Request, res: Response) => {
  const { userId, dlTestResult, operatorId } = req.body;

  // Validate input
  if (!userId || !dlTestResult || !operatorId) {
    return res.status(400).json({
      message: "userId, dlTestResult, and operatorId are required",
      success: false,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Check if the user exists
      const student = await tx.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          dlAppn: true, // Include the related DLAppn record
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Check if DLAppn already exists
      if (!student.dlAppn) {
        throw new Error("DLAppn not found");
      }

      // Update the DLAppn record with the result
      await tx.dLAppn.update({
        where: {
          id: student.dlAppn.id,
        },
        data: {
          testResult: dlTestResult,
          dlPdfUrl: null, // Optional field for PDF URL
        },
      });

      await tx.licenseProcess.update({
        where: {
          userId: userId,
        },
        data: {
          dlTestDay: "done", // means DL test result is pass
        },
      });

      const updatedStudent = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          License: "Completed", // Update the License field to "Completed"
        },
      });

      await tx.operator.update({
        where: {
          id: operatorId,
        },
        data: {
          DLcount: {
            increment: 1, // Increment DLcount by 1
          },
        },
      });

      if (updatedStudent.License === "Completed") {
        const existingLog = await tx.operatorAssistanceLog.findUnique({
          where: {
            operatorId_studentId: {
              // Default name for @@unique([operatorId, studentId])
              operatorId: operatorId,
              studentId: userId,
            },
          },
        });

        if (!existingLog) {
          await tx.operatorAssistanceLog.create({
            data: {
              operatorId: operatorId,
              studentId: userId,
            },
          });
          await tx.operator.update({
            where: { id: operatorId },
            data: {
              studentsCount: { increment: 1 },
            },
          });
        }
      }
    });

    return res.status(200).json({
      message: "DL test result updated successfully",
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

const getLicenseAppnDetails = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate input
    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
        success: false,
      });
    }

    // Fetch the user's license application details
    const licenseAppnDetails = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        dlAppn: true,
        llAppn: true,
      },
    });

    if (!licenseAppnDetails) {
      return res.status(404).json({
        message: "License application details not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "License application details fetched successfully",
      success: true,
      licenseAppnDetails,
    });
  } catch (error) {
    console.error("Get license application details error:", error);
    return res.status(500).json({
      message: "Failed to fetch license application details",
      success: false,
    });
  }
};

const getAllIssues = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    // Validate input
    if (!schoolId) {
      return res.status(400).json({
        message: "School ID is required",
        success: false,
      });
    }

    // Fetch all issues related to the school
    const issues = await prisma.issue.findMany({
      where: {
        schoolId: schoolId,
        status: "pending", // Fetch only pending issues
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!issues || issues.length === 0) {
      return res.status(404).json({
        message: "No issues found for the given school",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Issues fetched successfully",
      success: true,
      issues,
    });
  } catch (error) {
    console.error("Get all issues error:", error);
    return res.status(500).json({
      message: "Failed to fetch all issues",
      success: false,
    });
  }
};

const resolveIssue = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    // Validate input
    if (!issueId) {
      return res.status(400).json({
        message: "Issue ID is required",
        success: false,
      });
    }
    // Check if the issue exists
    const issue = await prisma.issue.findUnique({
      where: {
        id: issueId,
      },
    });

    if (!issue) {
      return res.status(404).json({
        message: "Issue not found",
        success: false,
      });
    }

    // Resolve the issue
    await prisma.issue.update({
      where: {
        id: issueId,
      },
      data: {
        status: "resolved",
      },
    });

    return res.status(200).json({
      message: "Issue resolved successfully",
      success: true,
    });
  } catch (error) {
    console.error("Resolve issue error:", error);
    return res.status(500).json({
      message: "Failed to resolve issue",
      success: false,
    });
  }
};

// Utility to get today's date in 'YYYY-MM-DD' format
function getTodayDateString() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

const getTodaysTasks = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    if (!schoolId) {
      return res.status(400).json({
        message: "schoolId is required",
        success: false,
      });
    }

    const today = getTodayDateString();

    // Fetch LL tests for today
    const llTasks = await prisma.lLAppn.findMany({
      where: {
        testDate: today,
        user: { schoolId },
      },
      include: { user: true },
    });

    // Fetch DL tests for today
    const dlTasks = await prisma.dLAppn.findMany({
      where: {
        testDate: today,
        user: { schoolId },
      },
      include: { user: true },
    });

    // Combine and format tasks
    const tasks = [
      ...llTasks.map((appn) => ({
        customerName: appn.user?.name || "Unknown",
        contactNo: appn.user?.phoneNumber || "N/A",
        testType: "LL test",
        time: appn.testTime,
      })),
      ...dlTasks.map((appn) => ({
        customerName: appn.user?.name || "Unknown",
        contactNo: appn.user?.phoneNumber || "N/A",
        testType: "DL test",
        time: appn.testTime,
      })),
    ];

    return res.status(200).json({
      message: "Today's important tasks fetched successfully",
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Error fetching today's tasks:", error);
    return res.status(500).json({
      message: "Failed to fetch today's tasks",
      success: false,
    });
  }
};

// Utility to get today and coming Sunday as 'YYYY-MM-DD'
function getWeekRangeFromToday() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + daysUntilSunday);

  // Format as 'YYYY-MM-DD'
  const format = (d: Date) => d.toISOString().slice(0, 10);
  return { weekStart: format(today), weekEnd: format(sunday) };
}

const getWeeksTasks = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    if (!schoolId) {
      return res.status(400).json({
        message: "schoolId is required",
        success: false,
      });
    }

    const { weekStart, weekEnd } = getWeekRangeFromToday();

    // Fetch LL tests for this week
    const llTasks = await prisma.lLAppn.findMany({
      where: {
        testDate: { gte: weekStart, lte: weekEnd },
        user: { schoolId },
      },
      include: { user: true },
    });

    // Fetch DL tests for this week
    const dlTasks = await prisma.dLAppn.findMany({
      where: {
        testDate: { gte: weekStart, lte: weekEnd },
        user: { schoolId },
      },
      include: { user: true },
    });

    // Days of week starting from today to Sunday
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayIdx = new Date(weekStart).getDay();
    const orderedDays = [];
    for (let i = 0; i <= 7 - todayIdx - 1; i++) {
      orderedDays.push(daysOfWeek[(todayIdx + i) % 7]);
    }
    if (todayIdx !== 0) orderedDays.push("Sunday"); // Always end with Sunday

    // Helper to get day name from date string
    function getDayName(dateStr: string) {
      const date = new Date(dateStr);
      return daysOfWeek[date.getDay()];
    }

    // Group tasks by day
    const dayMap: { [key: string]: any[] } = {};
    llTasks.forEach((appn) => {
      if (!appn.testDate) return;
      const day = getDayName(appn.testDate);
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push({
        customerName: appn.user?.name || "Unknown",
        contactNo: appn.user?.phoneNumber || "N/A",
        testType: "LL test",
        time: appn.testTime,
      });
    });
    dlTasks.forEach((appn) => {
      if (!appn.testDate) return;
      const day = getDayName(appn.testDate);
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push({
        customerName: appn.user?.name || "Unknown",
        contactNo: appn.user?.phoneNumber || "N/A",
        testType: "DL test",
        time: appn.testTime,
      });
    });

    // Prepare final array in order from today to Sunday
    const scheduledTests = orderedDays.map((day) => ({
      day,
      tests: dayMap[day] || [],
    }));

    return res.status(200).json({
      message: "This week's tasks fetched successfully",
      success: true,
      scheduledTests,
    });
  } catch (error) {
    console.error("Error fetching week's tasks:", error);
    return res.status(500).json({
      message: "Failed to fetch week's tasks",
      success: false,
    });
  }
};

const getStudentsCount = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    if (!schoolId) {
      return res.status(400).json({
        message: "schoolId is required",
        success: false,
      });
    }

    const count = await prisma.user.count({
      where: {
        schoolId: schoolId,
        OR: [{ LL: "Completed" }, { License: "Completed" }],
      },
    });

    return res.status(200).json({
      message: "Students count fetched successfully",
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching students count:", error);
    return res.status(500).json({
      message: "Failed to fetch students count",
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

    const user = await prisma.operator.update({
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
      imageUrl: image.secure_url,
      message: "user updated successfully",
      success: true,
    });
  } catch (error) {
    console.log("update user profile image error", error);
    return res.status(500).json({
      message: "Internal server error while updating profile image",
      success: false,
    });
  }
};

const getOperatorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "operator id is required",
        success: false,
      });
    }
    const operator = await prisma.operator.findUnique({
      where: {
        id,
      },
    });
    if (!operator) {
      return res.status(404).json({
        message: "operator not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "operator fetched successfully",
      success: true,
      operator,
    });
  } catch (error) {
    console.log("get operator by id error", error);
    return res.status(500).json({
      message: "Internal server error while fetching operator",
      success: false,
    });
  }
};

const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ message: "Email is required", success: false });

    const user = await prisma.teacher.findUnique({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found", success: false });

    const token = jwt.sign({ id: user.id }, process.env.RESET_SECRET!, {
      expiresIn: "15m",
    });

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"YourApp Support" <${process.env.BREVO_EMAIL}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
                <p>Hello ${user.name || "there"},</p>
                <p>Click the link below to reset your password. This link is valid for 15 minutes:</p>
                <a href="${resetLink}">${resetLink}</a>
            `,
    });

    return res.status(200).json({
      message: "Password reset email sent.",
      success: true,
    });
  } catch (error) {
    console.error("Reset email error:", error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({
        message: "Token and new password are required",
        success: false,
      });

    const decoded: any = jwt.verify(token, process.env.RESET_SECRET!);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.teacher.update({
      where: { id: decoded.id },
      data: { password: hashedPassword },
    });

    return res
      .status(200)
      .json({ message: "Password reset successful", success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(400)
      .json({ message: "Invalid or expired token", success: false });
  }
};

export {
  operatorSignUp,
  operatorLogin,
  changeOperatorPassword,
  getCurrentOperator,
  operatorLogout,
  refreshAccessToken,
  getStudentsForLicensing,
  getAllStudents,
  getStudentsCount,
  verifyDoc,
  llAppnUpdate,
  llResultUpdate,
  dlAppnUpdate,
  dlResultUpdate,
  getLicenseAppnDetails,
  getAllIssues,
  resolveIssue,
  getTodaysTasks,
  getWeeksTasks,
  updateUserProfileImage,
  getOperatorById,
  requestPasswordReset,
  resetPassword,
};
