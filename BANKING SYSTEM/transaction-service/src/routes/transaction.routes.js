const express = require('express');
const router = express.Router();
const { createtransfer, gethistory, getbalance, deposit, withdraw } = require('../controllers/transaction.controller.js');

// This defines the URL: POST /api/transaction/transfer
router.post('/transfer', createtransfer);

// This defines the URL: GET /api/transaction/history/:accountId
router.get('/history/:accountId', gethistory);

// This defines the URL: GET /api/transaction/balance/:accountId
router.get('/balance/:accountId', getbalance);

// This defines the URL: POST /api/transaction/deposit
router.post('/deposit', deposit);

// This defines the URL: POST /api/transaction/withdraw
router.post('/withdraw', withdraw);

module.exports = router;
