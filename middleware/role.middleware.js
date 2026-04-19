export const seekerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  if (req.user.role.toLowerCase() !== "seeker") {
    return res.status(403).json({ msg: "Seeker access only" });
  }

  next();
};

export const recruiterOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  if (req.user.role.toLowerCase() !== "recruiter") {
    return res.status(403).json({ msg: "Recruiter access only" });
  }

  next();
};