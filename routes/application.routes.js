import express from "express";
import {
  applyJob,
  getMyApplications,
  getApplicants,
  hireCandidate,
  updateApplicationStatus
} from "../controllers/application.controller.js";
import { updateJobStatus } from "../controllers/job.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { seekerOnly, recruiterOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/", auth, seekerOnly, applyJob);
router.get("/", auth, seekerOnly, getMyApplications);
router.get("/job/:jobId", auth, recruiterOnly, getApplicants);

router.put("/hire", auth, recruiterOnly, hireCandidate);
router.put("/status", auth, recruiterOnly, updateApplicationStatus);
router.put("/job-status", auth, recruiterOnly, updateJobStatus);

export default router;