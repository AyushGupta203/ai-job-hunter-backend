import Job from "../models/job.js";
import Application from "../models/Application.js";
import User from "../models/User.js";

export const createJob = async(req , res)=>{

  try{
    const { title, company, location, description, salary, experienceLevel, skills } = req.body;

    if(!title || !company || !location || !description){
      return res.status(400).json({msg: "All fields required"});
    }

    const user = await User.findById(req.user.id);
    if(!user){
      return res.status(401).json({msg: "user not found"})
      
    }
     // 🚫 ONLY recruiters
    if (user.role !== "recruiter") {
      return res.status(403).json({
        msg: "Only recruiters can post jobs",
      });
    }

    // 🚫 BLOCK unverified users
    if (!user.isEmailVerified) {
      return res.status(403).json({
        msg: "Verify your email before posting jobs",
      });
    }
       const suspiciousWords = [
      "earn money fast",
      "no experience high salary",
      "whatsapp only",
      "pay registration fee",
        "investment required",
        "dm on telegram",
          ];

    const text = `${title} ${description}`.toLowerCase();

    const isSuspicious = suspiciousWords.some(word =>
      text.includes(word)
    );

    if (isSuspicious) {
      return res.status(400).json({
        msg: "Job looks suspicious and was blocked",
      });
    
    }
    
    const job = await Job.create({
      title,
      company,
      location,
      description,
      salary: salary || "Not disclosed",
      experienceLevel: experienceLevel || "Not specified",
      skills: skills || "",
      postedBy: req.user.id
    });
    
    res.status(201).json(job);
  }
  catch(err){
    res.status(500).json({msg: err.message});
  }
};


//Get Jobs
export const getJobs = async (req, res)=>{
  try{
    const jobs = await Job.find().sort({ createdAt: -1 });

    res.json(jobs);
  }
  catch(err){
    res.status(500).json({msg: err.message});
  }
};


// Get Job By ID

export const getJobById = async(req, res)=>{
  try{
    const job = await Job.findById(req.params.id);

    if(!job){
      return res.status(404).json({msg: "Job Not Found"})
    }
    res.json(job);
  }
  catch(err){
    res.status(500).json({msg: err.message})
  }
};

// get my jobs
export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id })
                          .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const updateJobStatus = async (req , res) =>{
  const{jobId , status} = req.body;

  const job = await Job.findById(jobId);
    if (!job) {
    return res.status(404).json({ msg: "Job not found" });
  }
  if(job.postedBy.toString() !== req.user.id){
    return res.status(403).json({msg : "Not allowed"});
  }
  job.status = status;
  await job.save();
  res.json(job);
};

// Delete Job
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    // Delete all applications for this job
    await Application.deleteMany({ jobId: id });

    // Delete the job
    await Job.findByIdAndDelete(id);

    res.json({ msg: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};