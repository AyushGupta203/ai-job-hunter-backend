import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title:{
      type:String,
      required: true,
    },

    location: {
      type: String,
      required : true,
    },

    description:{
      type: String,
      required: true,
    },

    postedBy:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    company: {
  type: String,
  required: true,
},
status: {
  type: String,
  enum: ["open", "closed", "paused"],
  default: "open"
},
hiredCount: {
  type: Number,
  default: 0
},
salary: {
  type: String,
  default: "Not Disclosed"
},
experienceLevel: {
  type: String,
  default: "Not specified"
},
skills: {
  type: String,
  default: ""
}
  },
  {timestamps: true}
);
jobSchema.index({ title: "text", company: "text" });

jobSchema.index({ location: 1 });

jobSchema.index({ postedBy: 1 });

jobSchema.index({ status: 1 });
const Job = mongoose.model("Job" , jobSchema);
export default Job;