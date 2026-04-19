import User from "../models/User.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"


export const registerUser = async (req, res)=> {
  try{
    const {name , email , password , role} = req.body;

    if(!name || !email || !password || !role){
      return res.status(400).json({msg: "All fields required"});
    }
     const normalizedRole = role.toLowerCase();
      if (!["seeker", "recruiter"].includes(normalizedRole)) {
      return res.status(400).json({ msg: "Invalid role" });
    }
      const normalizedEmail = email.toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if(existingUser) {
        return res.status(400).json({msg: "User already exists"});
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await  User.create({
        name,
        email:normalizedEmail,
        password:hashedPassword,
        role: normalizedRole,
      });

      const token = jwt.sign(
        {id: user._id, role: user.role},
        process.env.JWT_SECRET,
        {expiresIn: "7d"}
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
      });
    }
    catch (error)
    {
    res.status(500).json({ msg: error.message });
    
  }
};

// login
export const loginUser = async (req, res)=> {
  try{
    const {email , password} = req.body;
    
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    
    if(!user) return res.status(400).json({msg:"Invalid credentials"});
    
    const isMatch = await bcrypt.compare(password , user.password);
    if(!isMatch) return res.status(400).json({msg:"Invalid Password"});
    

    const token = jwt.sign({
      id: user._id, role: user.role},
      process.env.JWT_SECRET,
      {expiresIn: "7d"}
    );
    
    res.json({
      token,
      user:{
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }
  catch(err){
    res.status(500).json({msg: err.message});
  }
};


export const getMe = (req, res) => {
  res.json(req.user);
};