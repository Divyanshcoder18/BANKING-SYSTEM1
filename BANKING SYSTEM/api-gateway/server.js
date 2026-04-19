require('dotenv').config();
const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors()); 

// RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 100,
    message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use(limiter);
app.use(express.json());

// CENTRALIZED LOGGING
app.use((req, res, next) => {
    console.log(`[GATEWAY] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const jwt = require('jsonwebtoken'); // Add this at the top

// THE SECURITY GUARD (Authentication Middleware)
const protect = (req, res, next) => {
    // 1. Get the token from the "Authorization" header
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: "No secret wristband (token) provided!" });
    }

    // 2. Verify the token using our secret key
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Oops! Your wristband is fake or expired." });
        }

        // 3. If everything is fine, let them in!
        req.user = decoded; // We save the user's data for later
        next(); 
    });
};








// ROUTING RECEPTIONS
app.use('/api/auth',proxy(process.env.AUTH_SERVICE_URL)); // anyone can login no need of protection 
app.use('/api/users',protect, proxy(process.env.USER_SERVICE_URL));
app.use('/api/transaction',protect, proxy(process.env.TRANSACTION_SERVICE_URL));
app.use('/api/notification',protect, proxy(process.env.NOTIFICATION_SERVICE_URL));
app.use('/api/fraud',protect, proxy(process.env.FRAUD_SERVICE_URL));
app.use('/api/audit',protect, proxy(process.env.AUDIT_SERVICE_URL));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`📡 API Gateway is running on port ${PORT}`);
    console.log(`🔒 Rate Limiting is ACTIVE`);
    console.log(`🚦 Routing is READY`);
});
