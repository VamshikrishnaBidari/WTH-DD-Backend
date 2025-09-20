import rateLimit from "express-rate-limit";

const signupRate = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    status: 429,
    message:
      "Too many signup attempts. Please try again later after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpRate = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    status: 429,
    message: "Too many OTP requests. Please try again later after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordRate = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    status: 429,
    message:
      "Too many password reset requests. Please try again later after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyRate = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message:
      "Too many OTP verification attempts. Please try again later after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const updateImageRate = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 2,
  message: {
    status: 429,
    message:
      "Too many image update attempts. Please try again later after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginRate = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message:
      "Too many login attempts. Please try again later after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const issueRate = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  message: {
    status: 429,
    message:
      "Too many issue submissions. Please try again later after 1 minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const scoreRate = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message: "Too many score requests. Please try again later after 1 minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const bookingRate = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message:
      "Too many booking/updating actions. Please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const progressRate = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message: "Too many progress updates. Please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const slotUpdateRate = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message: "Too many slot updates. Please try again after 5 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export {
  signupRate,
  otpRate,
  resetPasswordRate,
  otpVerifyRate,
  updateImageRate,
  loginRate,
  issueRate,
  scoreRate,
  bookingRate,
  slotUpdateRate,
  progressRate,
};
