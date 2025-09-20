import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import {
  addVehicleSyllabus,
  getVehicleSyllabus,
} from "../controllers/vehicleSyllabus.controller.ts";
const router = Router();

router.route("/create").post(verifyJWT, addVehicleSyllabus);
router.route("/get").post(verifyJWT, getVehicleSyllabus);

export default router;
