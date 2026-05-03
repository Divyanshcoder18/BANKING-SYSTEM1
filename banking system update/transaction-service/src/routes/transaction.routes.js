const express = require('express');
const router = express.Router();
const { createtransfer, gethistory, createdeposit, createwithdraw } = require('../controllers/transaction.controller.js');
const { createOrder, verifyPayment, verifyPaymentP2P, razorpayWebhook, initiateRealPayout, initiateRealP2PTransfer } = require('../controllers/payment.controller.js');
const { authmiddleware } = require('../middleware/auth.middleware.js');

// Standardized routes PROTECTED by authentication
router.post('/transfer', authmiddleware, createtransfer);
router.get('/history/:accountId', authmiddleware, gethistory);
router.post('/deposit', authmiddleware, createdeposit);
router.post('/withdraw', authmiddleware, createwithdraw);

// Razorpay Payment & Payout Routes
router.post('/payment/order', authmiddleware, createOrder);
router.post('/payment/payout', authmiddleware, initiateRealPayout);
router.post('/payment/payout/p2p', authmiddleware, initiateRealP2PTransfer);
router.post('/payment/verify', authmiddleware, verifyPayment);
router.post('/payment/verify/p2p', authmiddleware, verifyPaymentP2P);

// Webhook Route (No Auth Middleware - Called by Razorpay)
router.post('/payment/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);


module.exports = router;
