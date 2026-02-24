import jwt from "jsonwebtoken";
import User from "../models/user.model.js";





export const protect = async (req,res,next)=>{
  try{
    const token = req.cookies.token;

    if(!token) return res.status(401).json({message:"Unauthorized"});

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    next();

  }catch{
    return res.status(401).json({message:"Invalid token"});
  }
};
