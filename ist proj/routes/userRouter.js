/*const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/user-model');
const { generateToken } = require('../config/generateToken');

// Show auth page
router.get('/', (req, res) => {
    res.render('auth');  
});

// Register user
router.post('/auth', async (req, res) => {
    try {
        let { fullname, email, password } = req.body;

        // Hash password
        let salt = await bcrypt.genSalt(10);
        let hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        let user = await userModel.create({
            fullname,
            email,
            password: hashedPassword,
        });

        // Generate JWT token
        let token = generateToken(user) ; 
        // Save token in cookie
        res.cookie("token", token);

        res.send("User registered successfully!");
    } catch (err) {
        console.log(err.message);
        res.status(500).send("Registration failed!");
    }
});

module.exports = router;
*/

const express = require("express");
const router = express.Router();

// Import Controller
const { registerUser } = require("../controllers/authController");
const { loginUser } = require("../controllers/authController");
const { logout } = require("../controllers/authController");

// Show auth page
router.get("/", (req, res) => {
    res.render("auth");
});

// Register user route
router.post("/auth", registerUser);
router.post("/login",loginUser) ;
router.post("/logout",logout) ; 


module.exports = router;






