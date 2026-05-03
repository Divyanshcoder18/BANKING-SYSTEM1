const transactionmodel = require('../models/transaction.model.js');
const ledgermodel = require('../models/ledger.models.js');
const accountmodel = require('../models/account.model.js');
const mongoose = require('mongoose');
const { publishTransactionEvent } = require('../utils/producer.js');

const usermodel = require('../models/user.model.js');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

async function createtransfer(req, res) {
    const { fromaccount, toaccount, amount, idempotencyKey } = req.body;

    if (!fromaccount || !toaccount || !amount || !idempotencyKey) {
        return res.status(400).json({ success: false, message: "all fields are required" });
    }

    try {
        const fromAccount = await accountmodel.findOne({ _id: fromaccount, user: req.user.id || req.user._id });
        let targetAccount;

        // If toaccount looks like a VPA (contains @)
        if (toaccount.includes('@')) {
            const recipientUser = await usermodel.findOne({ vpa: toaccount.toLowerCase() });
            if (!recipientUser) {
                return res.status(404).json({ success: false, message: "UPI ID not found" });
            }
            // Find the first account for this user
            targetAccount = await accountmodel.findOne({ user: recipientUser._id });
            if (!targetAccount) {
                return res.status(404).json({ success: false, message: "Recipient has no active bank account" });
            }
        } else {
            // Standard Account ID
            targetAccount = await accountmodel.findById(toaccount);
        }

        if (!fromAccount || !targetAccount) {
            return res.status(404).json({ success: false, message: "Invalid account(s) provided" });
        }

        const balance = await fromAccount.getBalance();
        if (balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient balance" });
        }

        let recipientName = "Account holder";
        if (toaccount.includes('@')) {
            recipientName = toaccount; // Or we can use recipientUser.name for even better detail
        } else {
            // If it was an ID, we find the user name for that account
            const targetUser = await usermodel.findById(targetAccount.user);
            recipientName = targetUser ? targetUser.name : "Unknown";
        }

        const transaction = await transactionmodel.create({
            fromaccount: fromAccount._id,
            toaccount: targetAccount._id,
            amount,
            fromName: req.user.name,
            toName: recipientName,
            idempotencyKey,
            status: "SUCCESS"
        });

        await ledgermodel.create([
            { account: fromAccount._id, amount, transaction: transaction._id, type: "DEBIT" },
            { account: targetAccount._id, amount, transaction: transaction._id, type: "CREDIT" }
        ]);

        // 🚀 REAL-TIME SIGNAL (via Redis)
        // Tell the recipient they got money!
        redisClient.publish('payment_updates', JSON.stringify({
            userId: targetAccount.user,
            amount,
            status: 'SUCCESS',
            from: fromAccount._id,
            type: 'TRANSFER_RECEIVED'
        }));

        // RABBITMQ EVENT
        publishTransactionEvent({
            type: "TRANSFER",
            amount,
            from: fromAccount._id,
            to: targetAccount._id,
            userEmail: req.user.email,
            timestamp: new Date()
        });

        res.status(201).json({ 
            success: true, 
            message: "Transfer successful", 
            transaction: transaction,
            recipientName: toaccount.includes('@') ? toaccount : 'Account holder'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function createdeposit(req, res) {
    const { accountId, amount, idempotencyKey } = req.body;

    try {
        const account = await accountmodel.findOne({ _id: accountId, user: req.user.id || req.user._id });
        if (!account) return res.status(404).json({ success: false, message: "Account not found" });

        const transaction = await transactionmodel.create({
            fromaccount: account._id,
            toaccount: account._id,
            amount,
            idempotencyKey,
            fromName: "External Gateway",
            toName: req.user.name,
            status: "SUCCESS"
        });

        await ledgermodel.create([{ account: account._id, amount, transaction: transaction._id, type: "CREDIT" }]);

        publishTransactionEvent({
            type: "DEPOSIT",
            amount,
            account: account._id,
            userEmail: req.user.email,
            timestamp: new Date()
        });

        res.status(201).json({ success: true, message: "Deposit successful", transaction: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function createwithdraw(req, res) {
    const { accountId, amount, idempotencyKey } = req.body;

    try {
        const account = await accountmodel.findOne({ _id: accountId, user: req.user.id || req.user._id });
        if (!account) return res.status(404).json({ success: false, message: "Account not found" });

        const balance = await account.getBalance();
        if (balance < amount) return res.status(400).json({ success: false, message: "Insufficient balance" });

        const transaction = await transactionmodel.create({
            fromaccount: account._id,
            toaccount: account._id,
            amount,
            fromName: req.user.name,
            toName: "Cash Withdrawal",
            idempotencyKey,
            status: "SUCCESS"
        });

        await ledgermodel.create([{ account: account._id, amount, transaction: transaction._id, type: "DEBIT" }]);

        publishTransactionEvent({
            type: "WITHDRAWAL",
            amount,
            account: account._id,
            userEmail: req.user.email,
            timestamp: new Date()
        });

        res.status(201).json({ success: true, message: "Withdrawal successful", transaction: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function gethistory(req, res) {
    try {
        const { accountId } = req.params;
        const transactions = await transactionmodel.find({
            $or: [{ fromaccount: accountId }, { toaccount: accountId }]
        }).sort({ createdAt: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { createdeposit, createtransfer, gethistory, createwithdraw };
