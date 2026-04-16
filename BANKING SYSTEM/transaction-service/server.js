require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app.js');

// alg data base bnaya hai
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ Transaction Service Database Connected");
        
        // 2. Start Listening
        const PORT = process.env.PORT || 5001;
        app.listen(PORT, () => {
            console.log(`🚀 Transaction Service is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Database Connection Error:", err);
    });
