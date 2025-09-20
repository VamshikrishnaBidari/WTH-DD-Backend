import { Router } from "express";

const router = Router();

import { setHoliday } from "../controllers/holiday.controller.ts";

router.post("/setHoliday", setHoliday);

export default router;
