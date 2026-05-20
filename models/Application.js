import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  status: {
  type: String,
  enum: ["applied", "shortlisted", "rejected", "hired"],
  default: "applied"
},

   aiAnalysis: {
  matchScore: Number,
  missingSkills: [String],
  strengths: [String],
  weaknesses: [String],
  summary: String,
  analyzedAt: Date,
},


  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1 });

applicationSchema.index({ jobId: 1 });

applicationSchema.index({ createdAt: -1 });

applicationSchema.index({ status: 1 });

const Application = mongoose.model("Application", applicationSchema);

export default Application;