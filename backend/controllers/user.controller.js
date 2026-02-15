
import User from "../models/user.model.js";
import bcrypt from 'bcrypt';
import Profile from "../models/profile.model.js";
import crypto from 'crypto';


export const register = async (req, res) => {
    try {

    const { name, password, email, username } = req.body;

        if(!name || !password || !email || !username ) return res.status(400).json({message: "All are required"});

        const user = await User.findOne({
            email
        });
        if(user) return res.status(400).json({message: "this user is already registered"});

            const hashedPassword = await bcrypt.hash(password,10);
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                username
            });

            await newUser.save();
            const profile = new Profile({ userId: newUser._id });
            await profile.save();
            return res.json({message: "User Created"});


    } catch (err){
         console.error(err);
        return res.status(500).json({ message: err.message });
    }
};


export const login = async(req,res) => {
    try{
        const { email , password } = req.body;
        if(!email || !password ) return res.status(400).json({message: "required to fill"});

        const user = await User.findOne({
            email
        });

        if(!user) return res.status(404).json({message:"NOT FOUND"});

        const isMatch = await bcrypt.compare(password , user.password);

        if(!isMatch) return res.status(400).json({message: "Invalid password"});

        const token = crypto.randomBytes(32).toString("hex");
        await User.updateOne({_id: user._id}, { token });
        
        return res.json({ token });

    }catch(err){
        return res.status(500).json({message: err.message});
    }
};

export const upload_profile_picture = async(req,res)=> {
    const { token } = req.body;

    try{ 

        const user = await User.findOne({token: token});
        if(!user) { return res.status(404).json({message: "User not found"}); }

        user.profilePicture = req.file.filename;
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        await user.save();

        return res.json({message: "User Profile Updated"});

    }catch(err){

        return res.status(500).json({message: err.message});
    }
};


export const updateUserProfile = async(req,res) => {
    try{    
        const {token , ...newUserData} = req.body;
        const user = await User.findOne({token: token});
        if(!user) {
            return res.status(404).json({message: "User not found"});
        }

        const { username, email } = newUserData;    

        const existingUser = await User.findOne({ $or: [{username} , {email}]});
        if(existingUser){
            if(existingUser && String(existingUser._id ) !== String(user._id)){
                return res.status(400).json({message:"User already exist"});
            }
        }
        Object.assign(user, newUserData);
        await user.save();
        return res.json({message:"User Updated"});

    }catch(err){
        return res.status(500).json({message: err.message});
    }
};


export const getUserAndProfile = async (req,res) => {
    try{

        const { token } = req.body;
        const user = await User.findOne({token: token});

        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        const userProfile = await Profile.findOne({ userId: user._id })
            .populate('userId' , 'name email username profilePicture');

        return res.json(userProfile); 


    }catch(err){
        return res.status(500).json({message: err.message});
    }
}



export const updateProfileData = async (req, res) => {
    try {
        const { token, ...newProfileData } = req.body;
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let profile = await Profile.findOne({ userId: user._id });

        if (!profile) {
            profile = new Profile({
                userId: user._id,
                ...newProfileData
            });
        } else {
            Object.assign(profile, newProfileData);
        }
        await profile.save();

        return res.json({
            message: "Profile updated",
            profile
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


export const get_all_users = async(req,res) => {
    try{

        const profiles = await profiles.find().populate('userId', 'name username email profilePicture');
        return res.json({profiles});

    }catch(err){
        return res.status(500).json({message: err.message});
    }
};