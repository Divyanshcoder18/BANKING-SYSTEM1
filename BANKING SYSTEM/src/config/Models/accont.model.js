const mongoose  = require('mongoose');
const acctschema = new mongoose.Schema({

    user:{
        type: mongoose.Schema.Types.ObjectId  ,
        ref:"user",
        required:[true , 'User must exist'], 
        index:true , 
        
    },
    status:{
        type: String, // You must define a type for every attribute
        enum: {
            values: ["ACTIVE", "FREEZE", "CLOSED"], // Should be values instead of value
            message: "account may be suspended" // Message must be a string instead of an array
        },
        default: "ACTIVE" // Optional but helpful
    },
    currency:{
        type: String, 
        required:true  ,
        default:"INR" , 
    }




})

acctschema.index({user:1,status:1});

const accountmodel = mongoose.model("account",acctschema); 
module.exports = accountmodel ; 



