import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../utils/prismaClient.ts";
import { Request, Response } from "express";
import { uploadOnCloudinary } from "../utils/cloudinary.ts";
import { OAuth2Client } from "google-auth-library";
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
    { userId, role: "user" },
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
    { userId, role: "user" },
    secret as jwt.Secret,
    { expiresIn } as jwt.SignOptions,
  );
};

const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    if (!accessToken || !refreshToken)
      throw new Error("failed to generate access and refresh token");
    user.refreshToken = refreshToken;
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("generate access and refresh token error", error);
    throw new Error("failed to generate access and refresh token");
  }
};

const userSignUp2 = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password, phoneNumber, gender } = req.body;

    if (
      [name, email, password, phoneNumber, gender].some(
        (field) => field?.trim() === "",
      )
    ) {
      return res.status(400).json({
        message: "Please fill all the fields",
        success: false,
      });
    }
    console.log({ name, email, password, phoneNumber, gender });
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
    const avatarLocalPath = req.file?.path;

    const existingUser = await prisma.user.findUnique({
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
    let avatar = { url: "https://avatar.iran.liara.run/public" };
    if (avatarLocalPath) {
      const uploadResult = await uploadOnCloudinary(avatarLocalPath);

      if (!uploadResult || !uploadResult.secure_url) {
        return res.status(400).json({
          message: "Avatar upload failed",
          success: false,
        });
      }
      avatar = { url: uploadResult.secure_url };
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        image: avatar.url,
        phoneNumber,
        gender,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?.id,
    );
    // const logedInUser = await User.findById(user._id).lean();
    const logedInUser = await prisma.user.findUnique({
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
        message: "User created successfully",
        success: true,
        logedInUser,
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

const userSignUp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password, phoneNumber, age, gender, location } =
      req.body;
    if (
      [name, email, password, phoneNumber, gender, age].some(
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

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      return res.status(400).json({
        message: "Avatar is required",
        success: false,
      });
    }

    //check for existing user with email
    // const existingUser = await User.findOne({ email }).select("_id").lean();
    const existingUser = await prisma.user.findUnique({
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

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar || !avatar.secure_url) {
      return res.status(400).json({
        message: "Avatar upload failed",
        success: false,
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber,
        image: avatar.secure_url,
        age,
        gender,
        location,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "Failed to create user",
        success: false,
      });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?.id,
    );
    // const logedInUser = await User.findById(user._id).lean();
    const logedInUser = await prisma.user.findUnique({
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
        message: "User created successfully",
        success: true,
        logedInUser,
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

const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "email or password is required",
        success: false,
      });
    }

    // const user = await User.findOne({email}).select("_id password")
    const user = await prisma.user.findUnique({
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

    if (!user.password) {
      return res.status(400).json({
        message: "User password is missing",
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

// TODO:  see the flow for the case : i signup with email , if i try to login with google with same email

const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({
        message: "credential is required",
        success: false,
      });
    }
    if (!process.env.CLIENT_ID) {
      return res.status(400).json({
        message: "client id is required",
        success: false,
      });
    }
    const client = new OAuth2Client(process.env.CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({
        message: "Invalid token payload",
        success: false,
      });
    }
    const { email, name, picture, sub } = payload;
    if (!email || !name || !picture) {
      return res.status(400).json({
        message: "all fields are required",
        success: false,
      });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      // Conflict: email exists but not with Google
      if (existingUser.provider === "credentials" && !existingUser.googleId) {
        return res.status(400).json({
          message:
            "Email already registered with password. Please login using email and password.",
          success: false,
        });
      }

      // Optional: update googleId if missing
      if (!existingUser.googleId) {
        await prisma.user.update({
          where: { email },
          data: { googleId: sub, provider: "google" },
        });
      }
      const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(existingUser.id);
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
          user: existingUser,
          isNewUser: false,
          accessToken,
          refreshToken,
          message: "user logged in successfully",
          success: true,
        });
    }

    // 3. New Google user → create
    const newUser = await prisma.user.create({
      data: {
        email,
        googleId: sub,
        provider: "google",
        name,
        image: picture,
      },
    });

    //generate access and refersh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      newUser.id,
    );
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: newUser,
        isNewUser: true,
        accessToken,
        refreshToken,
        message: "user logged in successfully",
        success: true,
      });
  } catch (error) {
    console.log("google login error", error);
    return res.status(500).json({
      message: "Error while loggin in user",
      success: false,
    });
  }
};

const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Old and new passwords are required",
        success: false,
      });
    }
    const user = await prisma.user.findUnique({
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
    if (!user.password) {
      return res.status(400).json({
        message: "User password is missing",
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
    await prisma.user.update({
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

const getCurrentUser = async (req: Request, res: Response) => {
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

const userLogout = async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
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
    const user = await prisma.user.findUnique({
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

const getLatestCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const course = await prisma.course.findMany({
      where: {
        userId: id,
      },
      include: {
        teacher: {
          select: {
            name: true,
            email: true,
            image: true,
            school: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: { users: true },
                },
                dateJoined: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    if (!course) {
      return res.status(404).json({
        message: "course not found",
        success: false,
      });
    }
    let latestCourse = null;
    latestCourse = course.filter(
      (c) => c.completed === false && c.type.toLowerCase() === "two-wheeler",
    );
    if (!latestCourse || latestCourse.length === 0) {
      latestCourse = course.filter(
        (c) => c.completed === false && c.type.toLowerCase() === "four-wheeler",
      );
    }
    return res.status(200).json({
      course: latestCourse[0],
      studentCount: latestCourse[0]?.teacher?.school._count.users || 0,
      message: "course found successfully",
      success: true,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while getting latest course",
      success: false,
    });
  }
};

const getChatUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const course = await prisma.course.findMany({
      where: {
        userId: id,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            school: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    if (!course) {
      return res.status(404).json({
        message: "course not found",
        success: false,
      });
    }
    const uniqueTeachers = [...new Set(course.map((c) => c.teacher))];
    return res.status(200).json({
      users: uniqueTeachers,
      message: "Unique teachers found successfully",
      success: true,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while getting chat user",
      success: false,
    });
  }
};

const updateUser = async (req: Request, res: Response) => {
  try {
    const { id, data } = req.body;
    const user = await prisma.user.update({
      where: {
        id: id,
      },
      data: data,
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error while updating user",
      error,
      success: false,
    });
  }
};

const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
      include: {
        courses: {
          include: {
            teacher: true,
          },
        },
        llAppn: true,
        dlAppn: true,
        progress: true,
        orders: true,
        reviews: true,
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "user not found",
        success: false,
      });
    }
    return res.status(200).json({
      user,
      message: "user found successfully",
      success: true,
    });
  } catch (error) {
    console.log("get user by id error", error);
    return res.status(500).json({
      message: "Internal server error while getting user by id",
      success: false,
    });
  }
};

// note:  in future if we provide access to add the course after booking make changes here and user calendar for slots booking

const getAllCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "user id is required",
        success: false,
      });
    }
    const courses = await prisma.course.findMany({
      where: {
        userId: id,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            school: {
              select: {
                id: true,
                name: true,
              },
            },
            vehicle: true,
            experience: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    if (!courses) {
      return res.status(404).json({
        message: "courses not found",
        success: false,
      });
    }
    return res.status(200).json({
      courses,
      message: "courses found successfully",
      success: true,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while getting all courses",
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

    const user = await prisma.user.update({
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error while updating profile image",
      success: false,
    });
  }
};

const setLicensePreferences = async (req: Request, res: Response) => {
  const { userId, person, purpose, progress } = req.body;
  if (!userId) {
    return res.status(400).json({
      message: "user id is required",
      success: false,
    });
  }
  try {
    // Upsert progress: update if exists, else create
    // Check if progress exists for the user
    const result = await prisma.$transaction(async (tx) => {
      let progressData = await tx.licenseProcess.findUnique({
        where: { userId },
      });

      if (progressData) {
        // Update progress if exists
        progressData = await tx.licenseProcess.update({
          where: { userId },
          data: {
            documentVerification: progress.documentVerification,
            llApplication: progress.llApplication || undefined,
            llTestBooking: progress.llTestBooking || undefined,
            llTestDay: progress.llTestDay || undefined,
            dlApplication: progress.dlApplication || undefined,
            dlTestBooking: progress.dlTestBooking || undefined,
            dlTestDay: progress.dlTestDay || undefined,
            submitted: true,
          },
        });
      } else {
        // Create progress if not exists
        progressData = await tx.licenseProcess.create({
          data: {
            userId,
            documentVerification: progress.documentVerification,
            llApplication: progress.llApplication || undefined,
            llTestBooking: progress.llTestBooking || undefined,
            llTestDay: progress.llTestDay || undefined,
            dlApplication: progress.dlApplication || undefined,
            dlTestBooking: progress.dlTestBooking || undefined,
            dlTestDay: progress.dlTestDay || undefined,
            submitted: true,
          },
        });
      }

      // Update user with studentType and purpose only
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          studentType: person,
          purpose: purpose,
        },
      });
      if (!user) {
        throw new Error("user not found");
      }
    });
    return res.status(200).json({
      message: "License preferences set successfully",
      success: true,
      result,
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

const updateMockTestScore = async (req: Request, res: Response) => {
  try {
    const { userId, score } = req.body;
    if (!userId || typeof score !== "number") {
      return res.status(400).json({
        message: "userId and score are required",
        success: false,
      });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { mockTestScore: score },
    });
    return res.status(200).json({
      message: "Mock test score updated successfully",
      success: true,
      mockTestScore: user.mockTestScore,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while updating mock test score",
      success: false,
    });
  }
};

const getMockTestScore = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
        success: false,
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mockTestScore: true },
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "Mock test score fetched successfully",
      success: true,
      mockTestScore: user.mockTestScore,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while fetching mock test score",
      success: false,
    });
  }
};

const raiseIssue = async (req: Request, res: Response) => {
  try {
    const { userId, schoolId, description } = req.body;
    if (!userId || !schoolId || !description) {
      return res.status(400).json({
        message: "userId, schoolId, and description are required",
        success: false,
      });
    }
    const issue = await prisma.issue.create({
      data: {
        userId,
        schoolId,
        description,
      },
    });
    return res.status(201).json({
      message: "Issue raised successfully",
      success: true,
      issue,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error while raising issue",
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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found", success: false });

    const token = jwt.sign({ id: user.id }, process.env.RESET_SECRET!, {
      expiresIn: "15m",
    });

    const resetLink = `http://localhost:5173/forgot-password?token=${token}`;
    const response = await transporter.sendMail({
      from: `"YourApp Support" <ashlesh.prabhu5@gmail.com>`,
      to: email,
      subject: "Reset Your Password",
      html: `
                <p>Hello ${user.name || "there"},</p>
                <p>Click the link below to reset your password. This link is valid for 15 minutes:</p>
                <a href="${resetLink}">${resetLink}</a>
            `,
    });
    console.log(response);

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

    await prisma.user.update({
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

const subscribeToPush = async (req: Request, res: Response) => {
  const { subscription } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      success: false,
    });
  }

  try {
    if (!subscription) {
      return res.status(400).json({
        message: "Subscription is required",
        success: false,
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    console.log(subscription);

    // Store subscription as string (it's already an object from frontend)
    await prisma.user.update({
      where: { id: userId },
      data: { pushSubscription: JSON.stringify(subscription) },
    });

    return res.status(200).json({
      message: "Push subscription successful",
      success: true,
    });
  } catch (error) {
    console.error("Push subscription error:", error);
    return res.status(500).json({
      message: "Push subscription failed",
      success: false,
    });
  }
};

const sendDailyClassNotifications = async () => {
  try {
    const today = new Date();
    const todayDay = today.getDay();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayDayName = dayNames[todayDay];

    const users = await prisma.user.findMany({
      where: {
        schoolId: { not: null },
        weekCalendar: { isNot: null },
      },
      include: {
        weekCalendar: true,
      },
    });

    const schoolIds = [...new Set(users.map((user) => user.schoolId))].filter(
      (id): id is string => typeof id === "string",
    );
    const schools = await prisma.drivingSchool.findMany({
      where: { id: { in: schoolIds } },
      include: { slots: true },
    });

    const schoolMap = new Map(schools.map((school) => [school.id, school]));
    let notificationsSent = 0;

    await Promise.all(
      users.map(async (user) => {
        try {
          if (!user.schoolId) return;
          const school = schoolMap.get(user.schoolId);
          if (!school || !user.weekCalendar?.slots) return;

          const todaysSchoolSlots = school.slots.filter((slot) => {
            if (typeof slot.day === "number") {
              return slot.day === todayDay;
            } else if (typeof slot.day === "string") {
              return slot.day === todayDayName;
            }
            return false;
          });

          const todaysUserClasses = todaysSchoolSlots.filter((schoolSlot) =>
            user.weekCalendar?.slots.includes(schoolSlot.slotNumber),
          );

          if (todaysUserClasses.length > 0) {
            todaysUserClasses.sort((a, b) => a.time.localeCompare(b.time));
            const times = todaysUserClasses.map((cls) => cls.time);
            const timeString =
              times.length === 1
                ? times[0]
                : times.slice(0, -1).join(", ") +
                  " and " +
                  times[times.length - 1];

            const message = `Today you have ${todaysUserClasses.length === 1 ? "a class" : "classes"} at ${timeString}`;

            // send notification to user

            notificationsSent++;
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
        }
      }),
    );

    console.log(
      `Daily notifications sent to ${notificationsSent} users for ${todayDayName}`,
    );
    return { success: true, notificationsSent, day: todayDayName };
  } catch (error) {
    console.error("Error sending daily notifications:", error);
    return { success: false, error: "failed to send daily notifications" };
  }
};

const setLLstatus = async (req: Request, res: Response) => {
  try {
    const { userId, LL } = req.body;
    if (!userId || !LL) {
      return res.status(400).json({
        message: "Invalid request. userId and LL status are required.",
        success: false,
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { LL: LL },
    });

    return res.status(200).json({
      message: "LL status updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating LL status:", error);
    return res.status(500).json({
      message: "Failed to update LL status",
      success: false,
    });
  }
};

const setAmount = async (req: Request, res: Response) => {
  try {
    const { courseFee, licenseFee, userId, extraFee } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "courseFee, licenseFee and userId are required",
        success: false,
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(courseFee && { courseFee: courseFee }),
        ...(licenseFee && { licenseFee: licenseFee }),
        ...(extraFee && { extraFee: extraFee }),
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "Failed to update user",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Amount set successfully",
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error setting amount:", error);
    return res.status(500).json({
      message: "Failed to set amount",
      success: false,
    });
  }
};

const fetchAmount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
        success: false,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { courseFee: true, licenseFee: true, extraFee: true },
    });

    if (!user) {
      return res.status(404).json({
        message: "Failed to fetch user",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Amount fetched successfully",
      success: true,
      data: {
        courseFee: user.courseFee || 0,
        licenseFee: user.licenseFee || 0,
        extraFee: user.extraFee || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching amount:", error);
    return res.status(500).json({
      message: "Failed to fetch amount",
      success: false,
    });
  }
};

const lastClass = async (req: Request, res: Response) => {
  try {
    const { userId, teacherId, courseId } = req.body;
    if (!userId || !teacherId || !courseId) {
      return res.status(400).json({
        message: "userId, teacherId and courseId are required",
        success: false,
      });
    }
    await prisma.$transaction(async (tx) => {
      const user = await tx.weekCalendarUser.findFirst({
        where: { userId: userId },
      });
      if (!user) {
        return res.status(404).json({
          message: "User calendar not found",
          success: false,
        });
      }

      const teacherCalendar = await tx.calendar.findFirst({
        where: {
          teacherId,
        },
        include: {
          addClassSlots: true,
          bookedDates: true,
          weeklySlots: true,
          canceledSlots: true,
        },
      });
      if (!teacherCalendar) {
        return res.status(404).json({
          message: "Teacher calendar not found",
          success: false,
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          isReviewed: false,
        },
      });

      const addClassSlotsIds: string[] = [];
      const bookedDatesIds: string[] = [];
      const weeklySlotsIds: string[] = [];
      const canceledSlotsIds: string[] = [];

      teacherCalendar.addClassSlots.forEach((slot) => {
        if (user.addClassSlots.includes(slot.slot)) {
          addClassSlotsIds.push(slot.slot);
        }
      });

      teacherCalendar.bookedDates.forEach((slot) => {
        if (user.originalSlots.includes(slot.id)) {
          bookedDatesIds.push(slot.id);
        }
      });

      teacherCalendar.weeklySlots.forEach((slot) => {
        if (user.slots.includes(slot.id)) {
          weeklySlotsIds.push(slot.id);
        }
      });

      teacherCalendar.canceledSlots.forEach((slot) => {
        if (user.canceledSlots.includes(slot.id)) {
          canceledSlotsIds.push(slot.id);
        }
      });

      await tx.calendar.update({
        where: { id: teacherCalendar.id },
        data: {
          holidaySlots: {
            set: teacherCalendar.holidaySlots.filter(
              (slot) => !user.holidaySlots.includes(slot),
            ),
          },
        },
      });

      for (const id of addClassSlotsIds) {
        await tx.addClassSlot.delete({
          where: { id },
        });
      }

      for (const id of bookedDatesIds) {
        await tx.bookedDate.delete({
          where: { id },
        });
      }

      for (const id of weeklySlotsIds) {
        await tx.weeklySlot.delete({
          where: { id },
        });
      }

      for (const id of canceledSlotsIds) {
        await tx.canceledSlot.delete({
          where: { id },
        });
      }

      await tx.weekCalendarUser.delete({
        where: { id: user.id },
      });
    });
    return res.status(200).json({
      message: "Last class changes done successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error fetching last class:", error);
    return res.status(500).json({
      message: "Failed to fetch last class",
      success: false,
    });
  }
};

const reviewInstructor = async (req: Request, res: Response) => {
  try {
    const { rating, comment, userId, teacherId, courseId } = req.body;
    if (!rating || !comment || !userId || !teacherId || !courseId) {
      return res.status(400).json({
        message: "Rating, comment, userId, teacherId and courseId are required",
        success: false,
      });
    }
    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          rating,
          comment,
          userId,
          teacherId,
        },
      });
      await tx.course.update({
        where: { id: courseId },
        data: {
          isReviewed: true,
          completed: true,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          isReviewed: true,
        },
      });
    });
    return res.status(200).json({
      message: "Instructor reviewed successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to review instructor",
      success: false,
      error: error,
    });
  }
};

export {
  userSignUp,
  userLogin,
  changeUserPassword,
  getCurrentUser,
  refreshAccessToken,
  userLogout,
  getLatestCourse,
  getChatUser,
  updateUser,
  getUserById,
  getAllCourse,
  userSignUp2,
  updateUserProfileImage,
  googleLogin,
  setLicensePreferences,
  updateMockTestScore,
  getMockTestScore,
  raiseIssue,
  requestPasswordReset,
  resetPassword,
  subscribeToPush,
  sendDailyClassNotifications,
  setLLstatus,
  setAmount,
  fetchAmount,
  lastClass,
  reviewInstructor,
};
