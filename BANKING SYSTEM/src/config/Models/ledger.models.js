const mongoose = require('mongoose');

const ledgerschema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId, // Fixed mongoose.Schema.ObjectId
        ref: "account",
        required: true,
        index: true, 
        immutable: true, // Fixed spelling of immutable
    },
    amount: {
        type: Number, // Capitalized Number
        required: true ,
        immutable: true,
    },
    transaction: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "transaction",
        required: true,
        immutable: true,
    },
    type: {
        type: String,
        enum: ["DEBIT", "CREDIT"],
        required: [true, "ledger type is required"],
        immutable: true,
    }
});

// Moved function out of the schema!
function preventledgermodification() {
    throw new Error("ledger entry is immutable and cant be modified"); // Capitalized Error
}

// These hooks must be OUTSIDE the schema declaration
// Wait, 'save' shouldn't run this rule because we NEED to save it the first time!
// We only want to prevent updates and deleting.
ledgerschema.pre("updateOne", preventledgermodification);
ledgerschema.pre("updateMany", preventledgermodification);
ledgerschema.pre("findOneAndUpdate", preventledgermodification);
ledgerschema.pre("deleteOne", preventledgermodification);
ledgerschema.pre("deleteMany", preventledgermodification);
ledgerschema.pre("findOneAndDelete", preventledgermodification);
ledgerschema.pre("replaceOne", preventledgermodification);

// Actually create the model and export it
const ledgermodel = mongoose.model("ledger", ledgerschema);
module.exports = ledgermodel;
