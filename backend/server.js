import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose, { connect } from "mongoose";
import postRoutes from "./routes/post.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.use(postRoutes);
app.use(userRoutes);


const start = async ()=> {
    try{
        const connectDB = await connect(process.env.MONGO_URL);
        console.log("Mongo connected");
    app.listen(8000, ()=>{
        console.log("Server is connect");
    });
}catch(err){
        console.log(err);
    }
};

start();
