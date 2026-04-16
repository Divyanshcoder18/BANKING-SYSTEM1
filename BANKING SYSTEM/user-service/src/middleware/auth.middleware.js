const jwt = require('jsonwebtoken'); // Tool to read the secure "ID Cards"
const usermodel = require('../models/user.model.js'); // Tool to check our user blueprint

/**
 * This is our Bouncer function. 
 * It runs BEFORE any logic (controllers) to check if the user is allowed.
 */
async function authmiddleware(req, res, next) {
    try {
        // 1. Look for the token in Cookies or the "Authorization" header
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        // 2. If there is no token, we can't let them in!
        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }

        // 3. Verify the "ID Card" using our secret key
        // process.env.JWT_SECRET must match what the auth-service uses
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Extract the User ID from the token and find them in our database
        const user = await usermodel.findOne({ _id: decoded.id });
        
        // 5. If the user doesn't exist anymore, they are unauthorized
        if (!user) {
            return res.status(401).json({ message: "Unauthorized - User not found" });
        }

        // 6. SUCCESS! Attach the user object to the request so controllers can use it
        req.user = user;

        // 7. Tell Express to move to the next step (the controller)
        next();
    } catch (error) {
        // If the token is fake, expired, or something goes wrong, stop them here
        return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
}

module.exports = { authmiddleware };
