import { Router } from "express";
import {
  classRating,
  createCourse,
  deleteCourse,
  getAllCourses,
  getCourseById,
  getOrders,
  updateCourse,
} from "../controllers/course.controller.ts";

const router = Router();

router.route("/create").post(createCourse);
router.route("/update").patch(updateCourse);
router.route("/").get(getAllCourses);
router.route("/get").post(getCourseById);
router.route("/delete").patch(deleteCourse);
router.route("/getOrders").post(getOrders);
router.route("/ratings").post(classRating);

export default router;
