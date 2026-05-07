import express from "express";
import { getHeatmapData } from "../controllers/analytics.controller.js";
import { auth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/heatmap", auth, getHeatmapData);

export default router;