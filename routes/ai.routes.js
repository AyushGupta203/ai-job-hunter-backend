import express from "express";

import { auth } from "../middleware/auth.middleware.js";
import { recruiterOnly, seekerOnly } from "../middleware/role.middleware.js";
import { matchResume, recommendJobs, reviewResume, evaluate , improveBulletPoint, analyzeApplicant } from "../controllers/ai.controller.js";

const router = express.Router();


router.post("/match", auth, matchResume); // removed seekerOnly so recruiters can use it
router.get("/recommend", auth, seekerOnly, recommendJobs);
router.post("/resume-review", auth, seekerOnly, reviewResume);
router.post("/evaluate", auth, evaluate);
router.post("/improve-bullet", auth, improveBulletPoint);
router.post("/analyze-applicant", auth , recruiterOnly , analyzeApplicant) 

export default router;