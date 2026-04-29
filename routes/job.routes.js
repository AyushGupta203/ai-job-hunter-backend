import express from "express";
import { createJob, getJobs, getJobById, getMyJobs, updateJobStatus } from "../controllers/job.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { recruiterOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/mine", auth, recruiterOnly, getMyJobs);
router.post("/", auth, recruiterOnly, createJob);
router.get("/", getJobs);
router.get("/:id", getJobById);
router.put("/status", auth, recruiterOnly, updateJobStatus);


export default router;