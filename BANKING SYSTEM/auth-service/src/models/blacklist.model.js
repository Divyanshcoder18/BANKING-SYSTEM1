const mongoose = require('mongoose');

const tokenblacklistschema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to blacklist"], 
        unique: [true, "token already blacklisted"]
    },
}, { timestamps: true });

// Matches your 20-day expiration rule
tokenblacklistschema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("tokenblacklist", tokenblacklistschema);

