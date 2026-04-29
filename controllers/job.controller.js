import Job from "../models/job.js";

export const createJob = async(req , res)=>{

  try{
    const{title, company, location, description ,  salary} = req.body;

    if(!title || !company || !location || !description){
      return res.status(400).json({msg: "All fields required"});
    }

    const job = await Job.create({
      title,
      company,
      location,
      description,
      salary : salary || "Not disclosed",
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
  if(job.postedBy.toString() !== req.user.id){
    return res.status(403).json({msg : "Not allowed"});
  }
  job.status = status;
  await job.save();
  res.json(job);
};