import User from "../models/User.js";
import bcrypt from "bcryptjs"
import crypto from "crypto"; 
import jwt from "jsonwebtoken"
import sendEmail from "../utils/sendEmail.js";
import { getVerificationEmailTemplate } from "../utils/emailTemplates.js";

//REGISTER USER
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

      const salt = await bcrypt.genSalt(8);
      const hashedPassword = await bcrypt.hash(password, salt);

      const token = crypto.randomBytes(32).toString(`hex`);
      const emailVerificationExpires  = Date.now() + 3600000
      const user = await  User.create({
        name,
        email:normalizedEmail,
        password:hashedPassword,
        role: normalizedRole,
        emailVerificationToken: token,
        emailVerificationExpires,
        isEmailVerified: false,
      });
      const link = `${process.env.CLIENT_URL}/verify-email/${token}`;

      try {
        await sendEmail(
          normalizedEmail,
          "Verify your email - AI Job Hunter",
          getVerificationEmailTemplate(name, link)
        );
      } catch (err) {
        console.error("Failed to send verification email:", err.message);
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ msg: "Failed to send verification email. Please check your email configurations." });
      }

      return res.status(201).json({
        message: "Signup successful. Please verify your email",
      });

    }catch(err){
      console.error(err.message);
      res.status(500).json({msg: "Server error"});
    }
  };


  export const verifyEmail = async (req, res)=>{
    try{
      const {token} = req.params;

      const user = await User.findOne({emailVerificationToken: token,
        emailVerificationExpires: {$gt: Date.now()}
      });

      
      if(!user){
        return res.status(400).json({ msg: "Invalid or expired token" });
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;

      await user.save();

      const tokenJWT = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(200).json({
        token: tokenJWT,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        msg: "Email verified successfully. You can now login.",
      });

    }
    catch(err){
      console.error(err.message);
      res.status(500).json({ msg: "Server error" });
    }
  }

  

        




  

// login
export const loginUser = async (req, res)=> {
  try{
    const {email , password} = req.body;
    
    if(!email || !password){
      return res.status(400).json({msg: "Please enter all fields"});
    }
    
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    
    if(!user) return res.status(400).json({msg:"Invalid credentials"});

    if(!user.isEmailVerified){
      return res.status(403).json({
        msg:"please verify your email first"
      });
    }
    
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

// RESEND VERIFICATION EMAIL
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ msg: "Email is already verified" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = token;
    user.emailVerificationExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const link = `${process.env.CLIENT_URL}/verify-email/${token}`;

    try {
      await sendEmail(
        normalizedEmail,
        "Verify your email - AI Job Hunter",
        getVerificationEmailTemplate(user.name, link)
      );
      return res.status(200).json({ msg: "Verification email resent successfully" });
    } catch (err) {
      console.error("Failed to resend verification email:", err.message);
      return res.status(500).json({ msg: "Failed to send verification email. Please try again later." });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};