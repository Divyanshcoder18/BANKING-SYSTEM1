const mongoose = require("mongoose");

const ownerSchema = mongoose.Schema({
    fullname: String,
    email: String,
    password: String,
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    }],
    isadmin: {
        type: Boolean,
        default: false
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    }],
    contact: Number,
    picture: String
});

module.exports = mongoose.model("Owner", ownerSchema);
