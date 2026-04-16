const express = require('express');
const cookieParser = require('cookie-parser');
const transactionRoutes = require('./routes/transaction.routes.js');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Prefix all transaction routes with /api/transaction
app.use('/api/transaction', transactionRoutes);

module.exports = app;
