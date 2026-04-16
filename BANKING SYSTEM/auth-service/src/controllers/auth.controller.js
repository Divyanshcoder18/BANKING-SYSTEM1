const usermodel = require('../models/user.model.js');
const tokenblacklistmodel = require('../models/blacklist.model.js');
const jwt = require('jsonwebtoken');

// 1. Register a new user
const userregistercontroller = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user already exists
        const isexist = await usermodel.findOne({ email });
        if (isexist) {
            return res.status(402).json({ success: false, message: "User already exists" });
        }

        // Create user (hashing happens automatically in the model)
        const user = await usermodel.create({ email, password, name });

        // Generate Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24d" });
        
        res.cookie("token", token, { httpOnly: true }); 

        res.status(201).json({
            success: true,
            user: { _id: user._id, email: user.email, name: user.name },
            token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// 2. Login User
const userlogincontroller = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user and explicitly select password (because it is hidden by default)
        const user = await usermodel.findOne({ email }).select("+password");

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Use the method we defined in the model
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24d" });
        res.cookie("token", token, { httpOnly: true });

        res.status(200).json({
            success: true,
            user: { _id: user._id, email: user.email, name: user.name },
            token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// 3. Logout User
const userlogoutcontroller = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        
        if (!token) {
            return res.status(401).json({ success: false, message: "Token not found" });
        }

        // Add to blacklist so it cannot be used again
        await tokenblacklistmodel.create({ token });

        res.clearCookie("token");
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { userregistercontroller, userlogincontroller, userlogoutcontroller };
