import express from "express";
import { matchResume } from "../controllers/ai.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { seekerOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/match", auth, seekerOnly, matchResume);

export default router;