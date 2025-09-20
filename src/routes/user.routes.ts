import { Router } from "express";
import {
  changeUserPassword,
  getAllCourse,
  getChatUser,
  getCurrentUser,
  getLatestCourse,
  getUserById,
  googleLogin,
  refreshAccessToken,
  updateUser,
  updateUserProfileImage,
  userLogin,
  userLogout,
  userSignUp,
  userSignUp2,
  setLicensePreferences,
  updateMockTestScore,
  getMockTestScore,
  raiseIssue,
  resetPassword,
  requestPasswordReset,
  subscribeToPush,
  setLLstatus,
  setAmount,
  fetchAmount,
  reviewInstructor,
  lastClass,
} from "../controllers/user.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { upload } from "../middlewares/multer.middleware.ts";
import {
  issueRate,
  loginRate,
  resetPasswordRate,
  scoreRate,
  signupRate,
  updateImageRate,
} from "../middlewares/rateLimit.middleware.ts";

const router = Router();

router.route("/sign-up").post(userSignUp);
router
  .route("/sign-up2")
  .post(signupRate, upload.single("profileImage"), userSignUp2);
router.route("/sign-in").post(loginRate, userLogin);
router.route("/change-password").post(verifyJWT, changeUserPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/refresh-token").post(verifyJWT, refreshAccessToken);
router.route("/logout").post(verifyJWT, userLogout);
router.route("/latest-course").post(verifyJWT, getLatestCourse);
router.route("/get-chat-user").post(verifyJWT, getChatUser);
router.route("/update-user").post(verifyJWT, updateUser);
router.route("/get-user").post(verifyJWT, getUserById);
router.route("/all-courses").post(verifyJWT, getAllCourse);
router
  .route("/update-profile-image")
  .post(
    verifyJWT,
    updateImageRate,
    upload.single("profileImage"),
    updateUserProfileImage,
  );
router.route("/google").post(loginRate, googleLogin);
router.route("/license-preferences").post(verifyJWT, setLicensePreferences);
router
  .route("/mock-test-score")
  .post(verifyJWT, scoreRate, updateMockTestScore);
router.route("/get-score").post(verifyJWT, getMockTestScore);
router.route("/issue").post(verifyJWT, issueRate, raiseIssue);
router
  .route("/reset-password-request")
  .post(resetPasswordRate, requestPasswordReset);
router.route("/reset-password").post(resetPasswordRate, resetPassword);
router.route("/subscribe-to-push").post(verifyJWT, subscribeToPush);
router.route("/set-ll-status").post(verifyJWT, setLLstatus);
router.route("/set-amount").post(verifyJWT, setAmount);
router.route("/fetch-amount").post(verifyJWT, fetchAmount);
router.route("/review").post(verifyJWT, reviewInstructor);
router.route("/last-class").post(verifyJWT, lastClass);

export default router;
