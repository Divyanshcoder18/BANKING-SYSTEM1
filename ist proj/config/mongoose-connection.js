const mongoose = require("mongoose");
const debug = require("debug")("development:mongoose");

// FIXED: remove extra "config/" in path
const config = require("./development.json");

mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    debug("MongoDB connected");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

module.exports = mongoose.connection;
