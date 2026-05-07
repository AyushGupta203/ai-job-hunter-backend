import User from "../models/User.js";

export const updateProfile = async (req , res)=> {
  try{
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      {new: true}
    );

    res.json(updated);
  }
  catch(err){
    console.log(err)
    res.status(500).json({message:"Failed to update"});
  }
  
}
