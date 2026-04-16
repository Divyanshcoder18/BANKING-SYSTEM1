const mongoose = require('mongoose');

// This is the blueprint for a bank account
const acctschema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",                      // Points to our User model
        required: [true, 'User must exist'],
        index: true,                      // Makes searching for all accounts of a user super fast
    },
    status: {
        type: String,
        enum: {
            values: ["ACTIVE", "FREEZE", "CLOSED"], // Only these 3 options allowed
            message: "account may be suspended"
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: true,
        default: "INR",                   // Default is Indian Rupee
    }
}, { timestamps: true });

// We add an index to help MongoDB search efficiently
acctschema.index({ user: 1, status: 1 });

module.exports = mongoose.model("account", acctschema);
