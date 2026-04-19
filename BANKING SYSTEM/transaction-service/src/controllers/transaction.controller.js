const transactionmodel = require('../models/transaction.model.js');
const ledgermodel = require('../models/ledger.model.js');
const mongoose = require('mongoose');
const { publishTransactionEvent } = require('../utils/producer.js');

async function createtransfer(req, res) {
    const { fromaccount, toaccount, amount, idempotencyKey, email } = req.body;

    if (!fromaccount || !toaccount || !amount || !idempotencyKey || !email) {
        return res.status(400).json({ message: "All fields are required (including email for notifications)" });
    }

    // --- NEW: SENDER BALANCE CHECK ---
    try {
        const balanceResult = await ledgermodel.aggregate([
            { $match: { account: new mongoose.Types.ObjectId(fromaccount) } },
            {
                $group: {
                    _id: "$account",
                    totalBalance: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "CREDIT"] },
                                "$amount",
                                { $subtract: [0, "$amount"] }
                            ]
                        }
                    }
                }
            }
        ]);

        const currentBalance = balanceResult.length > 0 ? balanceResult[0].totalBalance : 0;
        
        if (currentBalance < amount) {
            return res.status(400).json({ 
                message: "Insufficient balance", 
                currentBalance, 
                required: amount 
            });
        }
    } catch (err) {
        return res.status(500).json({ message: "Error verifying balance", error: err.message });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Check Idempotency (Same logic as your monolith)
        const existingTx = await transactionmodel.findOne({ idempotencyKey });
        if (existingTx) {
            return res.status(400).json({ message: "Transaction already exists", status: existingTx.status });
        }

        // 2. Create Transaction (Same [0] array syntax you used)
        const transaction = await transactionmodel.create([{
            fromaccount,
            toaccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        // 3. Debit Entry
        await ledgermodel.create([{
            account: fromaccount,
            type: "DEBIT",
            amount: amount,
            transaction: transaction[0]._id
        }], { session });

        // --- Your custom processing delay logic ---
        await new Promise(resolve => setTimeout(resolve, 5000)); 

        // 4. Credit Entry
        await ledgermodel.create([{
            account: toaccount,
            type: "CREDIT",
            amount: amount,
            transaction: transaction[0]._id
        }], { session });

        // 5. Success
        transaction[0].status = "SUCCESS";
        await transaction[0].save({ session });

        await session.commitTransaction();
        session.endSession();

        // 6. ASYNC EVENT: Tell RabbitMQ the transaction is done
        // We don't "await" this if we want it truly async, but awaiting 
        // ensures we catch any connection errors early during debugging.
        await publishTransactionEvent({
            email,
            amount,
            type: "DEBIT", // or "TRANSFER"
            transactionId: transaction[0]._id,
            timestamp: new Date()
        });

        return res.status(201).json({ message: "Transaction successful", transaction: transaction[0] });

    } catch (error) {
        if (session.inAtomicity) await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: "Transaction failed", error: error.message });
    }
}

async function gethistory(req, res) {
    const { accountId } = req.params;

    try {
        const history = await transactionmodel.find({
            $or: [
                { fromaccount: accountId },
                { toaccount: accountId }
            ]
        }).sort({ createdAt: -1 });

        return res.status(200).json(history);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch history", error: error.message });
    }
}

/**
 * NEW: Calculate balance by summing all CREDIT and subtracting all DEBIT
 */
async function getbalance(req, res) {
    const { accountId } = req.params;

    try {
        const result = await ledgermodel.aggregate([
            { $match: { account: new mongoose.Types.ObjectId(accountId) } },
            {
                $group: {
                    _id: "$account",
                    totalBalance: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "CREDIT"] },
                                "$amount",
                                { $subtract: [0, "$amount"] }
                            ]
                        }
                    }
                }
            }
        ]);

        const balance = result.length > 0 ? result[0].totalBalance : 0;
        return res.status(200).json({ accountId, balance });
    } catch (error) {
        return res.status(500).json({ message: "Failed to calculate balance", error: error.message });
    }
}

/**
 * NEW: Deposit funds into an account
 */
async function deposit(req, res) {
    const { accountId, amount, idempotencyKey, email } = req.body;

    if (!accountId || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "Missing required fields for deposit" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Check Idempotency
        const existingTx = await transactionmodel.findOne({ idempotencyKey });
        if (existingTx) {
            return res.status(400).json({ message: "Transaction already exists", status: existingTx.status });
        }

        // 2. Create Deposit Transaction 
        // We use a specific "System" ID for the fromaccount if it's a deposit
        const SYSTEM_ID = new mongoose.Types.ObjectId("000000000000000000000000");

        const transaction = await transactionmodel.create([{
            fromaccount: SYSTEM_ID,
            toaccount: accountId,
            amount,
            idempotencyKey,
            status: "SUCCESS"
        }], { session });

        // 3. Create CREDIT Entry in Ledger
        await ledgermodel.create([{
            account: accountId,
            type: "CREDIT",
            amount: amount,
            transaction: transaction[0]._id
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // 4. Notification (Optional but good)
        if (email) {
            await publishTransactionEvent({
                email,
                amount,
                type: "CREDIT",
                transactionId: transaction[0]._id,
                timestamp: new Date()
            });
        }

        return res.status(201).json({ message: "Deposit successful", transaction: transaction[0] });

    } catch (error) {
        if (session.inAtomicity) await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: "Deposit failed", error: error.message });
    }
}

/**
 * NEW: Withdraw funds from an account
 */
async function withdraw(req, res) {
    const { accountId, amount, idempotencyKey, email } = req.body;

    if (!accountId || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "Missing required fields for withdrawal" });
    }

    // 1. Balance Check
    try {
        const balanceResult = await ledgermodel.aggregate([
            { $match: { account: new mongoose.Types.ObjectId(accountId) } },
            {
                $group: {
                    _id: "$account",
                    totalBalance: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "CREDIT"] },
                                "$amount",
                                { $subtract: [0, "$amount"] }
                            ]
                        }
                    }
                }
            }
        ]);

        const currentBalance = balanceResult.length > 0 ? balanceResult[0].totalBalance : 0;
        
        if (currentBalance < amount) {
            return res.status(400).json({ message: "Insufficient balance for withdrawal", currentBalance });
        }
    } catch (err) {
        return res.status(500).json({ message: "Error verifying balance", error: err.message });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Check Idempotency
        const existingTx = await transactionmodel.findOne({ idempotencyKey });
        if (existingTx) {
            return res.status(400).json({ message: "Transaction already exists", status: existingTx.status });
        }

        // 3. Create Withdrawal Transaction
        const SYSTEM_ID = new mongoose.Types.ObjectId("111111111111111111111111"); // Different ID for Teller/ATM

        const transaction = await transactionmodel.create([{
            fromaccount: accountId,
            toaccount: SYSTEM_ID,
            amount: amount,
            idempotencyKey: idempotencyKey,
            status: "SUCCESS"
        }], { session });

        // 4. Create DEBIT Entry in Ledger
        await ledgermodel.create([{
            account: accountId,
            type: "DEBIT",
            amount: amount,
            transaction: transaction[0]._id
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // 5. Notification
        if (email) {
            await publishTransactionEvent({
                email,
                amount,
                type: "WITHDRAWAL",
                transactionId: transaction[0]._id,
                timestamp: new Date()
            });
        }

        return res.status(201).json({ message: "Withdrawal successful", transaction: transaction[0] });

    } catch (error) {
        if (session.inAtomicity) await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: "Withdrawal failed", error: error.message });
    }
}

module.exports = { createtransfer, gethistory, getbalance, deposit, withdraw };
