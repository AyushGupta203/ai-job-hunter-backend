import express from "express";
import { createJob, getJobs, getJobById, getMyJobs, updateJobStatus } from "../controllers/job.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { recruiterOnly } from "../middleware/role.middleware.js";
import { getApplicants } from "../controllers/application.controller.js";
const router = express.Router();

router.get("/mine", auth, recruiterOnly, getMyJobs);
router.post("/", auth, recruiterOnly, createJob);
router.get("/", getJobs);
router.put("/status", auth, recruiterOnly, updateJobStatus);
router.get("/:id/applicants", auth, recruiterOnly, getApplicants);
router.get("/:id", getJobById);

export default router;