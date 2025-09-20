import { Router } from "express";
import {
  changeTeacherPassword,
  getCurrentTeacher,
  getStudents,
  getTeacherById,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  teacherLogin,
  teacherLogout,
  teacherSignUp,
  teacherSignUp2,
  updateUserProfileImage,
} from "../controllers/teacher.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { upload } from "../middlewares/multer.middleware.ts";
import {
  signupRate,
  resetPasswordRate,
  updateImageRate,
  loginRate,
} from "../middlewares/rateLimit.middleware.ts";

const router = Router();

router.route("/sign-up").post(signupRate, teacherSignUp);
router
  .route("/sign-up2")
  .post(signupRate, upload.single("profileImage"), teacherSignUp2);
router.route("/sign-in").post(loginRate, teacherLogin);
router.route("/change-password").post(verifyJWT, changeTeacherPassword);
router.route("/current-teacher").get(verifyJWT, getCurrentTeacher);
router.route("/refresh-token").post(verifyJWT, refreshAccessToken);
router.route("/get-students").post(verifyJWT, getStudents);
router.route("/get").post(verifyJWT, getTeacherById);
router
  .route("/update-profile-image")
  .post(
    verifyJWT,
    updateImageRate,
    upload.single("profileImage"),
    updateUserProfileImage,
  ); // ⬅️ Added updateImageRate
router.route("/logout").post(verifyJWT, teacherLogout);
router
  .route("/reset-password-request")
  .post(resetPasswordRate, requestPasswordReset);
router.route("/reset-password").post(resetPasswordRate, resetPassword);

export default router;
