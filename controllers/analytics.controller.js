import Application from "../models/Application.js";
import Job from "../models/job.js";

export const getHeatmapData = async (req, res) => {
  try {
    let applications = [];

    // SEEKER
    if (req.user.role === "seeker") {
      applications = await Application.find({
        userId: req.user.id,
      });
    }

    // RECRUITER
    else if (req.user.role === "recruiter") {
      const jobs = await Job.find({
        postedBy: req.user.id,
      });

      const jobIds = jobs.map((job) => job._id);

      applications = await Application.find({
        jobId: { $in: jobIds },
      });
    }

    // GROUP BY DATE
    const heatmap = {};

    applications.forEach((app) => {
      const date = app.createdAt.toISOString().split("T")[0];

      heatmap[date] = (heatmap[date] || 0) + 1;
    });

    const result = Object.keys(heatmap).map((date) => ({
      date,
      count: heatmap[date],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({
      msg: err.message,
    });
  }
};
