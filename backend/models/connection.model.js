import mongoose, { mongo } from "mongoose";

const connectRequest = new mongoose.Schema({
    userid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    connectionId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status_accepted:{
        type: Boolean,
        default: null
    }
});


const ConnectRequest = mongoose.model("ConnectRequest", connectRequest);

export default ConnectRequest;