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
    { userId, role: "teacher" },
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
    { userId, role: "teacher" },
    secret as jwt.Secret,
    { expiresIn } as jwt.SignOptions,
  );
};

const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await prisma.teacher.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    if (!accessToken || !refreshToken)
      throw new Error("failed to generate access and refresh token");
    user.refreshToken = refreshToken;
    await prisma.teacher.update({
      where: { id: userId },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("generate access and refresh token error", error);
    throw new Error("failed to generate access and refresh token");
  }
};

const teacherSignUp = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      age,
      gender,
      location,
      teacherId,
      schoolId,
      licenseNumber,
      registrationNumber,
      vehicle,
      expertise,
      experience,
      workingDays,
      workingHours,
    } = req.body;
    if (
      [
        name,
        email,
        password,
        phoneNumber,
        gender,
        age,
        teacherId,
        schoolId,
      ].some((field) => field?.trim() === "")
    ) {
      return res.status(400).json({
        message: "Please fill all the fields",
        success: false,
      });
    }
    // check gender
    if (gender !== "male" && gender !== "female" && gender !== "other") {
      return res.status(400).json({
        message: "Invalid gender",
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

    // check age
    try {
      if (parseInt(age) < 18) {
        return res.status(400).json({
          message: "You must be at least 18 years old",
          success: false,
        });
      }
    } catch {
      return res.status(400).json({
        message: "Invalid age",
        success: false,
      });
    }

    //check for existing user with email
    // const existingTeacher = await User.findOne({ email }).select("_id").lean();
    const existingTeacher = await prisma.teacher.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });
    if (existingTeacher) {
      return res.status(400).json({
        message: "User with the given email already exists",
        success: false,
      });
    }

    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return res.status(400).json({
        message: "School not found",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.teacher.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber,
        age,
        gender,
        location,
        schoolId,
        teacherId,
        licenseNumber,
        registrationNumber,
        vehicle,
        expertise,
        experience, // Add a default value for the required 'experience' field
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }
    const updatedSchool = await prisma.drivingSchool.update({
      where: {
        id: schoolId,
      },
      data: {
        teacherCount: school.teacherCount + 1,
      },
    });
    if (!updatedSchool) {
      return res.status(400).json({
        message: "Failed to update school",
        success: false,
      });
    }
    const availability = await prisma.availability.create({
      data: {
        teacherId: user.id,
        workingDays,
        workingHours,
      },
    });
    if (!availability) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?.id,
    );
    // const logedInUser = await User.findById(user._id).lean();
    const logedInTeacher = await prisma.teacher.findUnique({
      where: {
        id: user.id,
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
        message: "Teacher created successfully",
        success: true,
        logedInTeacher,
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

const teacherSignUp2 = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      gender,
      teacherId,
      schoolId,
      licenseNumber,
      registrationNumber,
      vehicle,
      expertise,
      experience,
      workingDays,
      workingHours,
    } = req.body;
    console.log("req body", req.body);
    if (
      [name, email, password, phoneNumber, gender, teacherId, schoolId].some(
        (field) => field?.trim() === "",
      )
    ) {
      return res.status(400).json({
        message: "Please fill all the fields",
        success: false,
      });
    }
    // check gender
    if (!["male", "female", "other"].includes(gender)) {
      return res.status(400).json({
        message: "Invalid gender",
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

    const existingTeacher = await prisma.teacher.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });
    if (existingTeacher) {
      return res.status(400).json({
        message: "User with the given email already exists",
        success: false,
      });
    }
    const school = await prisma.drivingSchool.findUnique({
      where: {
        id: schoolId,
      },
    });
    if (!school) {
      return res.status(400).json({
        message: "School not found",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let finalExpertise = expertise;
    if (expertise === "Both") {
      finalExpertise = ["Bike", "Car"];
    } else {
      finalExpertise = [expertise];
    }

    const user = await prisma.teacher.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber,
        gender,
        schoolId,
        teacherId,
        licenseNumber,
        registrationNumber,
        vehicle,
        expertise: finalExpertise,
        experience: Number(experience) || 0,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }
    const updatedSchool = await prisma.drivingSchool.update({
      where: {
        id: schoolId,
      },
      data: {
        teacherCount: school.teacherCount + 1,
      },
    });
    if (!updatedSchool) {
      return res.status(400).json({
        message: "Failed to update school",
        success: false,
      });
    }
    const availability = await prisma.availability.create({
      data: {
        teacherId: user.id,
        workingDays,
        workingHours,
      },
    });
    if (!availability) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }
    const logedInTeacher = await prisma.teacher.findUnique({
      where: {
        id: user.id,
      },
    });
    return res.status(200).json({
      message: "Teacher created successfully",
      success: true,
      logedInTeacher,
    });
  } catch (error) {
    console.log("user signup error", error);
    let errorMessage = "Error signing up user";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      message: errorMessage,
      success: false,
    });
  }
};

const teacherLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "email or password is required",
        success: false,
      });
    }
    // const user = await User.findOne({email}).select("_id password")
    const user = await prisma.teacher.findUnique({
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
      user?.id,
    );

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
        message: "teacher logged in successfully",
        success: true,
      });
  } catch (error) {
    console.log("teacher login error", error);
    return res.status(500).json({
      message: "Error while loggin in teacher",
      success: false,
    });
  }
};
// TODO: check change password logic
const changeTeacherPassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Old and new passwords are required",
        success: false,
      });
    }
    // const user=await User.findById(req.user._id).select("_id password")
    const user = await prisma.teacher.findUnique({
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
        message: "teacher not found",
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
    await prisma.teacher.update({
      where: { id: req.user?.id },
      data: { password: hashedNewPassword },
    });
    return res.status(200).json({
      message: "teacher password changed successfully",
      success: true,
    });
  } catch (error) {
    console.log("change teacher password error", error);
    return res.status(500).json({
      message: "failed to change teacher password",
      success: false,
    });
  }
};

const getCurrentTeacher = async (req: Request, res: Response) => {
  // get name,id,email,phone,insta,gender,pic
  try {
    if (!req.user) {
      return res.status(404).json({
        message: "Teacher not found",
        success: false,
      });
    }
    return res.status(200).json({
      user: req?.user,
      message: "Teacher found successfully",
      success: true,
    });
  } catch (error) {
    console.log("get current Teacher error", error);
    return res.status(500).json({
      message: "failed to get current teacher",
      success: false,
    });
  }
};

const teacherLogout = async (req: Request, res: Response) => {
  try {
    await prisma.teacher.update({
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
        message: "teacher logged out successfully",
        success: true,
      });
  } catch (error) {
    console.log("teacher logout error", error);
    return res.status(500).json({
      message: "failed to logout teacher",
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
    const user = await prisma.teacher.findUnique({
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
      sameSite: "none" as const,
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

const getStudents = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id || !id.trim("")) {
      return res.status(400).json({
        message: "teacher id is required",
        success: false,
      });
    }

    const ratingToScore: Record<string, number> = {
      Poor: 0,
      Average: 1,
      Good: 2,
      Moderate: 3,
      Excellent: 4,
    };

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        courses: {
          select: {
            id: true,
            type: true,
            classesTaken: true,
            classesTotal: true,
            stars: true,
            completed: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            history: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({
        message: "teacher not found",
        success: false,
      });
    }

    const userMap = new Map();

    teacher.courses.forEach((course) => {
      const scores = course.history
        .map((h) => ratingToScore[h.rating])
        .filter((s) => s !== undefined);

      const avgRating =
        scores.length > 0
          ? scores.reduce((sum, val) => sum + val, 0) / scores.length
          : null;

      const courseWithAvg = {
        ...course,
        avgRating,
      };

      if (course.user?.id) {
        if (!userMap.has(course.user.id)) {
          userMap.set(course.user.id, {
            ...course.user,
            courses: [courseWithAvg],
          });
        } else {
          userMap.get(course.user.id).courses.push(courseWithAvg);
        }
      }
    });

    const uniqueUsers = Array.from(userMap.values());

    return res.status(200).json({
      message: "students found successfully",
      success: true,
      data: uniqueUsers,
    });
  } catch (error) {
    console.log("get students error", error);
    return res.status(500).json({
      message: "failed to get students",
      success: false,
    });
  }
};

const getTeacherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id || !id.trim("")) {
      return res.status(400).json({
        message: "teacher id is required",
        success: false,
      });
    }
    const teacher = await prisma.teacher.findUnique({
      where: { id },
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
      },
    });
    if (!teacher) {
      return res.status(404).json({
        message: "teacher not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "teacher found successfully",
      success: true,
      data: teacher,
    });
  } catch (error) {
    console.log("get teacher by id error", error);
    return res.status(500).json({
      message: "failed to get teacher",
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

    const user = await prisma.teacher.update({
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
    const decoded: any = jwt.verify(token, process.env.RESET_SECRET!) as {
      id: string;
    };
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
  teacherLogin,
  teacherSignUp,
  changeTeacherPassword,
  getCurrentTeacher,
  teacherLogout,
  refreshAccessToken,
  getStudents,
  getTeacherById,
  teacherSignUp2,
  updateUserProfileImage,
  requestPasswordReset,
  resetPassword,
};
