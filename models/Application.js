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

applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

const Application = mongoose.model("Application", applicationSchema);

export default Application;