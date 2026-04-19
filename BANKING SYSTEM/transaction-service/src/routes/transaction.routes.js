const express = require('express');
const router = express.Router();
const { createtransfer, gethistory } = require('../controllers/transaction.controller.js');

// This defines the URL: POST /api/transaction/transfer
router.post('/transfer', createtransfer);

// This defines the URL: GET /api/transaction/history/:accountId
router.get('/history/:accountId', gethistory);

module.exports = router;
