import Application from "../models/Application.js";
import Job from "../models/job.js";

export const applyJob = async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ msg: "Job ID required" });
    }
    const existing = await Application.findOne({
  userId: req.user.id,
  jobId,
});

if (existing) {
  return res.status(400).json({ msg: "Already applied" });
}

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    const application = await Application.create({
      jobId,
      userId: req.user.id,
    });

    res.status(201).json(application);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Already applied" });
    }
    res.status(500).json({ msg: err.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.user.id })
      .populate("jobId")
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const getApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({
      _id: jobId,
      postedBy: req.user.id,
    });

    if (!job) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const applicants = await Application.find({ jobId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(applicants);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};