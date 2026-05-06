import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Route imports
import authRoutes from "../routes/auth.routes.js";
import jobRoutes from "../routes/job.routes.js";
import applicationRoutes from "../routes/application.routes.js";
import resumeRoutes from "../routes/resume.routes.js";
import aiRoutes from "../routes/ai.routes.js";

const app = express();

// ── Middleware ──────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",").map((o) => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// ── API Routes ─────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai", aiRoutes);

// ── Health check ───────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "API is running" });
});

// ── 404 Handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

// ── Error Handler (ALWAYS LAST) ────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Server error" });
});

export default app;