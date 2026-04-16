require('dotenv').config(); // 1. Load our secret locker (.env)
const mongoose = require('mongoose');
const app = require('./src/app.js'); // 2. Import our Restaurant Building

/**
 * THE POWER SWITCH (server.js)
 * This file is the entry point. It connects to the database 
 * and then starts the server.
 */

// Step 1: Connect to the Database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ User Service Database Connected");
        
        // Step 2: Start Listening for Requests
        // We use port 5003 for the User Service
        const PORT = process.env.PORT || 5003;
        app.listen(PORT, () => {
            console.log(`🚀 User Service is running on port ${PORT}`);
            console.log(`🔗 Standard Path: http://localhost:${PORT}/api/account`);
        });
    })
    .catch((err) => {
        // This stops the server if the database can't be reached
        console.error("❌ User DB Connection Error:", err);
    });
