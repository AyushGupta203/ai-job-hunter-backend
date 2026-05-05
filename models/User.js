import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:{
      type : String,
      required : true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },

    role:{
      type: String,
      enum:["seeker" ,"recruiter"],
      required: true,
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    resumeText: {
      type: String,
      default: "",
    },
    aiUsageCount:{
      type : Number,
      default: 0,
    },
    aiResetAt:{
      type: Date,
    },
    recommendations: {
      type: Array,
      default: [],
    },

    isEmailVerified:{
      type:Boolean,
      default: false
    },
    emailVerificationToken:String,
    emailVerificationExpires:Date,

  },
  {timestamps: true}
);

const User = mongoose.model("User" , userSchema);
export default User;