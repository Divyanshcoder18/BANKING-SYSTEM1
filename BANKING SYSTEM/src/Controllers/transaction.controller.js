const transactionmodel = require('../config/Models/transaction.model.js');
const ledgermodel = require('../config/Models/ledger.models.js');
const emailservice = require('../services/email.services.js');
const accountmodel = require('../config/Models/accont.model.js'); // Fixed: missing import
const mongoose = require('mongoose'); // Fixed: missing import for session


async function createinitialfunds(req, res) { // Fixed: was "functioncreateinitialfunds" (missing space)
    const { toaccount, amount, idempotencykey } = req.body;

    if (!toaccount || !amount || !idempotencykey) {
        return res.status(400).json({
            message: "all the fields are required",
        })
    }

    const existingtransaction = await transactionmodel.findOne({
        idempotencyKey: idempotencykey, // Fixed: field name must match schema (idempotencyKey)
    })
    if (existingtransaction) {
        return res.status(400).json({
            message: "transaction already exists",
        })
    }

    // Fixed: all this code was OUTSIDE the function (after closing } on line 24)
    const touseraccount = await accountmodel.findOne({ // Fixed: accountmodel now imported
        _id: toaccount,
    })

    if (!touseraccount) {
        return res.status(404).json({
            message: "user not found -INVALID ACCOUNT",
        })
    }

    const fromuseraccount = await accountmodel.findOne({ // Fixed: findone -> findOne
        user: req.user._id,
        status: "ACTIVE",
        systemUser: true, // Fixed: schema field is systemUser not systemuser
    })

    if (!fromuseraccount) {
        return res.status(404).json({
            message: "SYSTEM user not found -INVALID ACCOUNT",
        })
    }

    const session = await mongoose.startSession(); // Fixed: mongoose now imported
    session.startTransaction();

    try {
        const transaction = await transactionmodel.create([{ // Fixed: was "transacation" (typo)
            fromaccount: fromuseraccount._id, // Fixed: was "fromuuseraccount" (double u typo)
            toaccount: touseraccount._id,
            amount: amount,
            idempotencyKey: idempotencykey, // Fixed: field name to match schema
            status: "PENDING",
        }], { session }) // Fixed: session passed correctly as 2nd arg

        const debitledgerentry = await ledgermodel.create([{ // Fixed: was "awaitledgermodel" (missing space)
            account: fromuseraccount._id,
            type: "DEBIT",
            amount: amount,
            transaction: transaction[0]._id,
        }], { session })

        const creditledgerentry = await ledgermodel.create([{ // Fixed: was "constcreditledgerentry" (missing space)
            account: touseraccount._id,
            type: "CREDIT",
            amount: amount,
            transaction: transaction[0]._id,
        }], { session })

        transaction[0].status = "SUCCESS"; // Fixed: "COMPLETED" not in enum, must be "SUCCESS"
        await transaction[0].save({ session }); // Fixed: missing save() to persist status change

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ // Fixed: missing success response
            message: "Transaction successful",
            transaction: transaction[0],
        })

    } catch (error) { // Fixed: missing try/catch — session would hang forever on error
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({
            message: "Transaction failed",
            error: error.message,
        })
    }
}

module.exports = { createinitialfunds };