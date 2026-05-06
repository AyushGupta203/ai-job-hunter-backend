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
// CLIENT_URL can be a comma-separated list of allowed frontend URLs:
//   e.g. CLIENT_URL=https://ai-job-hunter.vercel.app,https://www.myjobsite.com
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean)
    : []),
];

console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / Postman / curl (no Origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`🔴 CORS blocked: ${origin}`);
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