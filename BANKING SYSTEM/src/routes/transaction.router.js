const express = require('express');
const router = express.Router();
const { authmiddleware, authsystemmiddleware } = require('../middleware/auth.middleware.js');
const { createinitialfunds } = require('../Controllers/transaction.controller.js');

router.post('/transaction', authsystemmiddleware, createinitialfunds);

module.exports = router;
