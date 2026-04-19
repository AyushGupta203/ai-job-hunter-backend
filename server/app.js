import express from "express";
import cors from "cors";
import authRoutes from "../routes/auth.routes.js"
import jobRoutes from  "../routes/job.routes.js"
import { auth } from "../middleware/auth.middleware.js";
import applicationRoutes from "../routes/application.routes.js";
import aiRoutes from "../routes/ai.routes.js"
import resumeRoutes from "../routes/resume.routes.js"
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.get("/" , (req , res)=> {
  res.send("API is running..")
});
app.use("/api/applications", applicationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai" , aiRoutes)






export default app;