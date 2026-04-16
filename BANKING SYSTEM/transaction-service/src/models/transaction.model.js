const mongoose = require('mongoose');

const transactionschema = new mongoose.Schema({
    fromaccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "account", // Lowercase to match monolith
        required: true,
        index: true,
    },
    toaccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "account", // Lowercase to match monolith
        required: true,
    },
    status:{
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
        default: "PENDING",
    },
    amount:{
        type: Number,
        required: true,
    },
    idempotencyKey:{
        type: String,
        required: true,
        unique: true,
    }
}, { timestamps: true });

module.exports = mongoose.model("transaction", transactionschema); // Lowercase "transaction"
