const transactionmodel = require('../models/transaction.model.js');
const ledgermodel = require('../models/ledger.model.js');
const mongoose = require('mongoose');
const { publishTransactionEvent } = require('../utils/producer.js');

async function createtransfer(req, res) {
    const { fromaccount, toaccount, amount, idempotencyKey, email } = req.body;

    if (!fromaccount || !toaccount || !amount || !idempotencyKey || !email) {
        return res.status(400).json({ message: "All fields are required (including email for notifications)" });
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

module.exports = { createtransfer };
