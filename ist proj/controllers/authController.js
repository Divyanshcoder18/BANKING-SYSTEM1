const bcrypt = require("bcryptjs");
const userModel = require("../models/user-model");
const { generateToken } = require("../config/generateToken");

module.exports.registerUser = async (req, res) => {
    try {
        let { fullname, email, password } = req.body;

     let user2 = await userModel.findOne({email:email}) ; 
     if(user2){
        return res.status(401).send("user2 already exist"); 
     }

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
        let token = generateToken(user);

        // Save token in cookie
        res.cookie("token", token);

        res.send("User registered successfully!");
    } catch (err) {
        console.log(err.message);
        res.status(500).send("Registration failed!");
    }
};

module.exports.loginUser = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Check if user exists
        let user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).send("Email or password incorrect");
        }

        // Compare password
        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send("Email or password incorrect");
        }

        // Generate token
        let token = generateToken(user);

        // Save token in cookie
        res.cookie("token", token);

        res.send("Login successful!");
    } catch (err) {
        console.log(err.message);
        res.status(500).send("Login failed!");
    }



};

module.exports.logout = (req, res) => {
    try {
        res.clearCookie("token");  // remove jwt
        req.flash("success", "Logged out successfully");
        res.redirect("/");         // redirect to auth page
    } catch (err) {
        console.log(err.message);
        res.status(500).send("Logout failed!");
    }
};

