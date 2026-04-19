import express from "express";
import { uploadResume } from "../controllers/resume.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { seekerOnly } from "../middleware/role.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/upload", auth, seekerOnly, upload.single("resume"), uploadResume);

export default router;