
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

    }
};