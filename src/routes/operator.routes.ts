import { Router } from "express";
import {
  operatorSignUp,
  operatorLogin,
  changeOperatorPassword,
  getCurrentOperator,
  operatorLogout,
  refreshAccessToken,
  getStudentsForLicensing,
  getAllStudents,
  verifyDoc,
  dlAppnUpdate,
  llAppnUpdate,
  llResultUpdate,
  getLicenseAppnDetails,
  dlResultUpdate,
  resolveIssue,
  getAllIssues,
  getTodaysTasks,
  getStudentsCount,
  getWeeksTasks,
  updateUserProfileImage,
  getOperatorById,
  requestPasswordReset,
  resetPassword,
} from "../controllers/operator.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { upload } from "../middlewares/multer.middleware.ts";
import {
  signupRate,
  loginRate,
  resetPasswordRate,
  updateImageRate,
} from "../middlewares/rateLimit.middleware.ts";

const router = Router();

router.route("/signup").post(signupRate, operatorSignUp);
router.route("/login").post(loginRate, operatorLogin);
router.route("/logout").post(verifyJWT, operatorLogout);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeOperatorPassword);
router.route("/").get(verifyJWT, getCurrentOperator);
router
  .route("/get-licensing-students")
  .post(verifyJWT, getStudentsForLicensing);
router.route("/get-all-students").post(verifyJWT, getAllStudents);
router.route("/verify-doc").post(verifyJWT, verifyDoc);
router.route("/ll-appn").post(verifyJWT, llAppnUpdate);
router.route("/ll-result").patch(verifyJWT, llResultUpdate);
router.route("/dl-appn").post(verifyJWT, dlAppnUpdate);
router.route("/dl-result").patch(verifyJWT, dlResultUpdate);
router.route("/get-licensing-details").post(verifyJWT, getLicenseAppnDetails);
router.route("/resolve-issue/:issueId").patch(verifyJWT, resolveIssue);
router.route("/get-all-issues/:schoolId").get(verifyJWT, getAllIssues);
router.route("/get-todays-tasks/:schoolId").get(verifyJWT, getTodaysTasks);
router.route("/get-weeks-tasks/:schoolId").get(verifyJWT, getWeeksTasks);
router.route("/students-count/:schoolId").get(verifyJWT, getStudentsCount);
router
  .route("/update-profile-image")
  .patch(
    verifyJWT,
    updateImageRate,
    upload.single("profileImage"),
    updateUserProfileImage,
  );
router.route("/get").post(verifyJWT, getOperatorById);
router
  .route("/reset-password-request")
  .post(resetPasswordRate, requestPasswordReset);
router.route("/reset-password").post(resetPasswordRate, resetPassword);

export default router;
