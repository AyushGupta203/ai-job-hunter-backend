import express from "express";
import cors from "cors";

// Route imports
import authRoutes from "../routes/auth.routes.js";
import jobRoutes from "../routes/job.routes.js";
import applicationRoutes from "../routes/application.routes.js";
import resumeRoutes from "../routes/resume.routes.js";
import aiRoutes from "../routes/ai.routes.js";

const app = express();

// ── Middleware ──────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── API Routes ─────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai", aiRoutes);

// ── Health check ───────────────────────────────
app.get("/", (req, res) => res.json({ status: "API is running" }));

export default app;