const mongoose  = require('mongoose');

const userSchema = mongoose.Schema({

    fullname: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    Cart: {
        type: Array,
        default: []
    },

    isadmin: {
        type: Boolean,
        default: false
    },

    orders: {
        type: Array,
        default: []
    },

    contact: {
        type: Number
    },

    picture: {
        type: String
    }

});

module.exports = mongoose.model("user", userSchema);
