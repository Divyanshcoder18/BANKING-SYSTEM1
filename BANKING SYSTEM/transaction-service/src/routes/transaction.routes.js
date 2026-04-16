const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller.js');

// This defines the URL: POST /api/transaction/transfer
router.post('/transfer', transactionController.createtransfer);

module.exports = router;
