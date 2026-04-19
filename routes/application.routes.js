import express from "express";
import {
  applyJob,
  getMyApplications,
  getApplicants,
} from "../controllers/application.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { seekerOnly, recruiterOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/", auth, seekerOnly, applyJob);
router.get("/", auth, seekerOnly, getMyApplications);
router.get("/job/:jobId", auth, recruiterOnly, getApplicants);

export default router;