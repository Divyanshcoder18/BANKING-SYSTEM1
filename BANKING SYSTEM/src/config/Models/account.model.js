const mongoose = require('mongoose');
const acctschema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, 'User must exist'],
        index: true,

    },
    status: {
        type: String, // You must define a type for every attribute
        enum: {
            values: ["ACTIVE", "FREEZE", "CLOSED"], // Should be values instead of value
            message: "account may be suspended" // Message must be a string instead of an array
        },
        default: "ACTIVE" // Optional but helpful
    },
    currency: {
        type: String,
        required: true,
        default: "INR",
    }




})

acctschema.index({ user: 1, status: 1 });

acctschema.methods.getBalance = async function(){  // ✅ Fix 1: method→methods (with s), Fix 2: getbalance→getBalance (capital B)
    const ledgermodel = require('./ledger.models.js'); // ✅ correct path: accont.model.js is already IN the Models folder

    const balance = await ledgermodel.aggregate([
        {
            $match:{
                account:this._id, 
            }
        },
        {
            $group:{
                _id:"$type",
                total:{$sum:"$amount"}
            }
        },

    ])
     let credits = 0 ;
        let debit =  0 ;
        for(let entry of balance){
            if(entry._id=='CREDIT'){   // ✅ Fix 3: entry.id → entry._id (MongoDB always uses _id)
                credits+=entry.total;
            }
            if(entry._id=='DEBIT'){    // ✅ explicit DEBIT check (safer than else — ignores unexpected values)
                debit+=entry.total;
            }
        }
        return credits-debit ; 
       

   
}

const accountmodel = mongoose.model("account", acctschema);
module.exports = accountmodel;



