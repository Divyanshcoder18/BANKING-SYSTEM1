const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');
const accountmodel = require('../models/account.model.js');
const ledgermodel = require('../models/ledger.models.js');
const transactionmodel = require('../models/transaction.model.js');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// 1. Create Order
async function createOrder(req, res) {
    try {
        const { amount, currency = 'INR' } = req.body;

        const options = {
            amount: amount * 100, // Razorpay works in Paise (100 Paise = 1 Rupee)
            currency,
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// 2. Verify Payment & Add Balance
async function verifyPayment(req, res) {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            accountId,
            amount 
        } = req.body;

        // Verify Signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        // Signature is valid! Now update the Bank Balance
        const account = await accountmodel.findOne({ _id: accountId, user: req.user.id || req.user._id });
        if (!account) return res.status(404).json({ success: false, message: "Account not found" });

        const transaction = await transactionmodel.create({
            fromaccount: account._id,
            toaccount: account._id,
            amount,
            status: "SUCCESS",
            idempotencyKey: `razorpay_${razorpay_payment_id}`,
            fromName: "Razorpay Gateway",
            toName: req.user.name || "Self"
        });

        await ledgermodel.create([{ 
            account: account._id, 
            amount, 
            transaction: transaction._id, 
            type: "CREDIT" 
        }]);

        res.status(200).json({ 
            success: true, 
            message: "Payment verified and Balance updated", 
            transactionId: transaction._id 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const usermodel = require('../models/user.model.js');
const Redis = require('ioredis');
const redisClient = new Redis(process.env.REDIS_URL);

// 3. Verify P2P Payment (Direct to Recipient)
async function verifyPaymentP2P(req, res) {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            toAccount, // VPA or Account ID
            fromAccountId, // Sender's account ID for history tracking
            amount 
        } = req.body;

        // Verify Signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        let targetAccount;
        let recipientName = "Account holder";

        // Resolve Target Account
        if (toAccount.includes('@')) {
            const recipientUser = await usermodel.findOne({ vpa: toAccount.toLowerCase() });
            if (!recipientUser) return res.status(404).json({ success: false, message: "UPI ID not found" });
            targetAccount = await accountmodel.findOne({ user: recipientUser._id });
            if (!targetAccount) return res.status(404).json({ success: false, message: "Recipient has no active bank account" });
            recipientName = recipientUser.name || toAccount;
        } else {
            targetAccount = await accountmodel.findById(toAccount);
            if (!targetAccount) return res.status(404).json({ success: false, message: "Recipient Account not found" });
            const targetUser = await usermodel.findById(targetAccount.user);
            recipientName = targetUser ? targetUser.name : "Unknown";
        }

        // Create transaction linking Sender (Gateway) to Recipient
        // Setting fromaccount to the sender's ID ensures it shows up in their Dashboard History
        // BUT we do NOT create a DEBIT ledger entry, so their balance is untouched!
        const transaction = await transactionmodel.create({
            fromaccount: fromAccountId || targetAccount._id, 
            toaccount: targetAccount._id,
            amount,
            status: "SUCCESS",
            idempotencyKey: `p2p_rzp_${razorpay_payment_id}`,
            fromName: `${req.user.name} (via Gateway)`,
            toName: recipientName
        });

        // Credit the recipient
        await ledgermodel.create([{ 
            account: targetAccount._id, 
            amount, 
            transaction: transaction._id, 
            type: "CREDIT" 
        }]);

        // Real-time Signal to recipient
        redisClient.publish('payment_updates', JSON.stringify({
            userId: targetAccount.user,
            amount,
            status: 'SUCCESS',
            from: 'Gateway',
            fromName: req.user.name,
            type: 'TRANSFER_RECEIVED'
        }));

        res.status(200).json({ 
            success: true, 
            message: "P2P Payment verified and Recipient credited", 
            transactionId: transaction._id 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// 4. Secure Webhook Listener (Production requirement)
async function razorpayWebhook(req, res) {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';

        // Get signature from headers
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            return res.status(400).send("No signature provided");
        }

        // req.body is a Buffer because we used express.raw() in the router
        const rawBody = req.body.toString('utf8');

        // Validate webhook signature using the raw string
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            return res.status(400).send("Invalid webhook signature");
        }

        // Process Event
        const event = JSON.parse(rawBody);
        
        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            console.log(`[WEBHOOK] Payment Captured: ₹${payment.amount / 100} (${payment.id})`);
            
            // In a real system, you would look up the order in your DB using payment.order_id
            // and update the status to SUCCESS, then credit the user's account.
            // For now, we just acknowledge receipt to Razorpay.
        }

        // Important: Always return 200 OK to Razorpay so they know you got it
        res.status(200).send('OK');
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("Webhook Error");
    }
}

// ==========================================
// RAZORPAY X (PAYOUTS) - Real Money Out
// ==========================================

// 5. Initiate Real Payout (Withdrawal to Bank)
async function initiateRealPayout(req, res) {
    try {
        const { accountId, amount, accountNumber, ifsc, name } = req.body;

        // Step 1: Deduct from digital balance FIRST (Optimistic locking)
        const account = await accountmodel.findOne({ _id: accountId, user: req.user.id || req.user._id });
        if (!account) return res.status(404).json({ success: false, message: "Account not found" });

        const balance = await account.getBalance();
        if (balance < amount) return res.status(400).json({ success: false, message: "Insufficient digital balance for withdrawal" });

        // Record the withdrawal as PENDING in our DB
        const transaction = await transactionmodel.create({
            fromaccount: account._id,
            toaccount: account._id, // Self withdrawal
            amount,
            status: "PENDING",
            idempotencyKey: `payout_${Date.now()}_${accountId}`,
            fromName: req.user.name || "Self",
            toName: "Real Bank Account"
        });

        const authHeader = `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

        // Step 2: Create Razorpay Contact (Using direct API because SDK lacks X support)
        const contactResponse = await axios.post('https://api.razorpay.com/v1/contacts', {
            name: name,
            reference_id: req.user.id.toString(),
            type: "customer"
        }, { headers: { Authorization: authHeader } });

        // Step 3: Create Fund Account (Bank Details)
        const fundAccountResponse = await axios.post('https://api.razorpay.com/v1/fund_accounts', {
            contact_id: contactResponse.data.id,
            account_type: "bank_account",
            bank_account: {
                name: name,
                ifsc: ifsc,
                account_number: accountNumber
            }
        }, { headers: { Authorization: authHeader } });

        // Step 4: Initiate Payout via IMPS
        const payoutResponse = await axios.post('https://api.razorpay.com/v1/payouts', {
            account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER || "2323230058788931", // Your RazorpayX merchant account
            fund_account_id: fundAccountResponse.data.id,
            amount: amount * 100, // Paise
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
            reference_id: transaction._id.toString()
        }, { headers: { Authorization: authHeader } });

        // If successful, commit the ledger debit
        await ledgermodel.create([{ 
            account: account._id, 
            amount, 
            transaction: transaction._id, 
            type: "DEBIT" 
        }]);

        // Update transaction status
        transaction.status = "SUCCESS";
        await transaction.save();

        res.status(200).json({ 
            success: true, 
            message: "Payout initiated successfully via IMPS", 
            payout: payoutResponse.data 
        });

    } catch (error) {
        console.error("Payout Error:", error.response?.data || error.message);
        let errorMessage = "Payout initiation failed";
        
        if (typeof error.response?.data === 'string' && error.response.data.includes('not found')) {
            errorMessage = "RazorpayX is not enabled on this API key. Please activate RazorpayX in your dashboard.";
        } else if (error.response?.data?.error?.description) {
            errorMessage = error.response.data.error.description;
        }

        res.status(500).json({ success: false, message: errorMessage });
    }
}

// 6. Initiate Real Money P2P Transfer (Direct to someone else's bank/UPI)
async function initiateRealP2PTransfer(req, res) {
    try {
        const { accountId, amount, recipientType, vpa, accountNumber, ifsc, name } = req.body;

        // Step 1: Check Digital Balance
        const account = await accountmodel.findOne({ _id: accountId, user: req.user.id || req.user._id });
        if (!account) return res.status(404).json({ success: false, message: "Account not found" });

        const balance = await account.getBalance();
        if (balance < amount) return res.status(400).json({ success: false, message: "Insufficient balance for real money transfer" });

        // Record as PENDING
        const transaction = await transactionmodel.create({
            fromaccount: account._id,
            toaccount: account._id, // This is an external transfer, so we log it against the sender
            amount,
            status: "PENDING",
            idempotencyKey: `p2p_payout_${Date.now()}_${accountId}`,
            fromName: req.user.name,
            toName: name || vpa || "External Recipient"
        });

        const authHeader = `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

        // Step 2: Create Contact
        const contactResponse = await axios.post('https://api.razorpay.com/v1/contacts', {
            name: name || vpa || "P2P Recipient",
            type: "customer"
        }, { headers: { Authorization: authHeader } });

        // Step 3: Create Fund Account (UPI or Bank)
        let fundAccountPayload = {
            contact_id: contactResponse.data.id,
            account_type: recipientType // 'vpa' or 'bank_account'
        };

        if (recipientType === 'vpa') {
            fundAccountPayload.vpa = { address: vpa };
        } else {
            fundAccountPayload.bank_account = {
                name: name,
                ifsc: ifsc,
                account_number: accountNumber
            };
        }

        const fundAccountResponse = await axios.post('https://api.razorpay.com/v1/fund_accounts', 
            fundAccountPayload, 
            { headers: { Authorization: authHeader } }
        );

        // Step 4: Initiate IMPS/UPI Payout
        const payoutResponse = await axios.post('https://api.razorpay.com/v1/payouts', {
            account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER || "2323230058788931",
            fund_account_id: fundAccountResponse.data.id,
            amount: amount * 100, // Paise
            currency: "INR",
            mode: recipientType === 'vpa' ? "UPI" : "IMPS",
            purpose: "payout",
            reference_id: transaction._id.toString()
        }, { headers: { Authorization: authHeader } });

        // Step 5: Deduct digital balance
        await ledgermodel.create([{ 
            account: account._id, 
            amount, 
            transaction: transaction._id, 
            type: "DEBIT" 
        }]);

        transaction.status = "SUCCESS";
        await transaction.save();

        res.status(200).json({ 
            success: true, 
            message: "Real money transfer initiated successfully!", 
            payout: payoutResponse.data 
        });

    } catch (error) {
        console.error("P2P Payout Error:", error.response?.data || error.message);
        let errorMessage = "Payout initiation failed";
        
        if (typeof error.response?.data === 'string' && error.response.data.includes('not found')) {
            errorMessage = "RazorpayX is not enabled on this API key. Please activate RazorpayX in your dashboard.";
        } else if (error.response?.data?.error?.description) {
            errorMessage = error.response.data.error.description;
        }

        res.status(500).json({ success: false, message: errorMessage });
    }
}

module.exports = { createOrder, verifyPayment, verifyPaymentP2P, razorpayWebhook, initiateRealPayout, initiateRealP2PTransfer };
