import { Router } from "express";
import {
  createCourseCombo,
  createLicenseSyllabus,
  createLicenseSyllabusCombo,
  createSyllabus,
  getCompletedCoursesThisMonth,
  getCompletedCoursesThisWeek,
  getCoordinators,
  getCourseCombo,
  getFeedBack,
  getLicenseCombo,
  getLicenseSyllabus,
  getSchool,
  getStudents,
  getStudentsEnrolledThisMonth,
  getStudentsEnrolledThisWeek,
  getSyllabus,
  getTeacherCanceledClassesThisMonth,
  getTeacherCanceledClassesThisWeek,
  getTeacherClassesThisMonth,
  getTeacherClassesThisWeek,
  getTeachers,
  getTeachersWithStats,
  refreshAccessToken,
  schoolLogin,
  schoolLogout,
  schoolRegister,
  updateSchool,
  updateSchoolImage,
  updateUserProfileImage,
} from "../controllers/driving.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { upload } from "../middlewares/multer.middleware.ts";
import {
  loginRate,
  signupRate,
  updateImageRate,
} from "../middlewares/rateLimit.middleware.ts";

const router = Router();

router
  .route("/sign-up")
  .post(signupRate, upload.single("profileImage"), schoolRegister);
router.route("/login").post(loginRate, schoolLogin);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, schoolLogout);
router.route("/get-school").get(verifyJWT, getSchool);
router.route("/get-teachers").post(verifyJWT, getTeachersWithStats);
router.route("/create-syllabus").post(verifyJWT, createSyllabus);
router.route("/get-syllabus").post(verifyJWT, getSyllabus);
router
  .route("/get-teacher-classes-this-week")
  .post(verifyJWT, getTeacherClassesThisWeek);
router
  .route("/get-teacher-classes-this-month")
  .post(verifyJWT, getTeacherClassesThisMonth);
router
  .route("/get-teacher-canceled-classes-this-week")
  .post(verifyJWT, getTeacherCanceledClassesThisWeek);
router
  .route("/get-teacher-canceled-classes-this-month")
  .post(verifyJWT, getTeacherCanceledClassesThisMonth);
router
  .route("/get-students-enrolled-this-week")
  .post(verifyJWT, getStudentsEnrolledThisWeek);
router
  .route("/get-students-enrolled-this-month")
  .post(verifyJWT, getStudentsEnrolledThisMonth);
router
  .route("/get-completed-course-this-week")
  .post(verifyJWT, getCompletedCoursesThisWeek);
router
  .route("/get-completed-course-this-month")
  .post(verifyJWT, getCompletedCoursesThisMonth);
router.route("/get-coordinators").post(verifyJWT, getCoordinators);
router.route("/get-students").post(verifyJWT, getStudents);
router.route("/get-feedback").post(verifyJWT, getFeedBack);
router.route("/get-teachers2").post(verifyJWT, getTeachers);
router
  .route("/update-profile-image")
  .post(
    verifyJWT,
    updateImageRate,
    upload.single("profileImage"),
    updateUserProfileImage,
  );
router.route("/update").post(verifyJWT, updateSchool);
router
  .route("/update-logo")
  .post(
    verifyJWT,
    updateImageRate,
    upload.single("profileImage"),
    updateSchoolImage,
  );
router.route("/create-course-combo").post(verifyJWT, createCourseCombo);
router.route("/create-license-syllabus").post(verifyJWT, createLicenseSyllabus);
router
  .route("/create-license-combo")
  .post(verifyJWT, createLicenseSyllabusCombo);
router.route("/get-license-syllabus").post(verifyJWT, getLicenseSyllabus);
router.route("/get-license-combo").post(verifyJWT, getLicenseCombo);
router.route("/get-course-combo").post(verifyJWT, getCourseCombo);

export default router;
