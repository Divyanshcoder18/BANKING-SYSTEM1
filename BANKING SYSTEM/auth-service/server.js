require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app.js');

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ Auth Service Database Connected");
        
        // Auth listens on 5002
        const PORT = process.env.PORT || 5002;
        app.listen(PORT, () => {
            console.log(`🚀 Auth Service is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Auth DB Connection Error:", err);
    });
