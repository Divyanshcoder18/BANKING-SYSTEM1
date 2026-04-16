const express = require('express');
const cookieParser = require('cookie-parser');
const accountRoutes = require('./routes/account.routes.js'); // Import our Menu

const app = express();

/**
 * MIDDLEWARES
 * These are like the plumbing and electricity of our building.
 * They handle the data before it reaches our routes.
 */

// 1. Allows us to read JSON data sent in the request body
app.use(express.json());

// 2. Allows us to read "URL encoded" data (standard for forms)
app.use(express.urlencoded({ extended: true }));

// 3. Allows us to read cookies so we can find our JWT tokens
app.use(cookieParser());


/**
 * REGISTERING ROUTES
 * Every URL in this service will now start with /api/account
 */
app.use('/api/account', accountRoutes);

module.exports = app;
