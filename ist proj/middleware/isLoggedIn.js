const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async function (req, res, next) {
    // No token → redirect to login
    if (!req.cookies.token) {
        req.flash("error", "You need to login first");
        return res.redirect("/");
    }

    try {
        // Verify token
        let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);

        // Fetch user by email
        let user = await userModel.findOne({ email: decoded.email }).select("-password");

        // If no user found → invalid token
        if (!user) {
            req.flash("error", "Invalid token or user not found");
            return res.redirect("/");
        }

        // Add user to req object
        req.user = user;

        next(); // Proceed to route
    } catch (err) {
        console.log(err.message);
        req.flash("error", "Something went wrong");
        res.redirect("/");
    }
};

