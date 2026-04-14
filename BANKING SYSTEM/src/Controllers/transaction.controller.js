const transactionmodel = require('../config/Models/transaction.model.js');
const ledgermodel = require('../config/Models/ledger.models.js');
const emailservice = require('../services/email.services.js');
const accountmodel = require('../config/Models/account.model.js'); // Updated: renamed file
const mongoose = require('mongoose'); // Fixed: missing import for session

async function createtransfer(req, res) { // ✅ Fix 1: code was outside any function
    const {fromaccount,toaccount,amount,idempotencyKey} = req.body ;

    if(!fromaccount || !toaccount || !idempotencyKey){
        return res.status(401).json({
           message:"all three are required"

        })
    }

    // ab aase bhi ho skta hai id hi glt ho accounterski

    const fromuser = await accountmodel.findOne({
        _id: fromaccount ,  // ✅ Fix 2: was _id = fromaccount  (= → :)
    })

    const touser = await accountmodel.findOne({
        _id: toaccount ,  // ✅ Fix 3: was _id = toaccount  (= → :)
    })
}

async function createinitialfunds(req, res) { // Fixed: was "functioncreateinitialfunds" (missing space)
    const { toaccount, amount, idempotencykey } = req.body;

    if (!toaccount || !amount || !idempotencykey) {
        return res.status(400).json({
            message: "all the fields are required",
        })
    }
// validate idempotency key
    const existingtransaction = await transactionmodel.findOne({
        idempotencyKey: idempotencykey,
    })   
    if (existingtransaction) {

        if(existingtransaction.status === "SUCCESS"){
            return res.status(400).json({
                message: "transaction already exists",
            })
        }

        if(existingtransaction.status === "PENDING"){
            return res.status(400).json({
                message: "transaction is pending please wait",
            })
        }
        if(existingtransaction.status === "FAILED"){
            return res.status(400).json({
                message: "transaction Failed please try again",
            })
        }
        // Note: "CANCELLED" is not in your transaction model enum, so removed that check
      
    }

    // Fixed: all this code was OUTSIDE the function (after closing } on line 24)
    const touseraccount = await accountmodel.findOne({
        _id: toaccount,
    })

    // ✅ null check FIRST — before populate, otherwise crash if account doesn't exist
    if (!touseraccount) {
        return res.status(404).json({
            message: "user not found -INVALID ACCOUNT",
        })
    }

    // populate user so we can get their email and name for notification
    await touseraccount.populate('user')

    const fromuseraccount = await accountmodel.findOne({ // Fixed query: systemUser is on User, not Account
        user: req.user._id,
        status: "ACTIVE",
    })

    if (!fromuseraccount) {
        return res.status(404).json({
            message: "SYSTEM user not found -INVALID ACCOUNT",
        })
    }

    // ✅ 3. Check account status — compare .status property, not the object itself
    if(fromuseraccount.status !== 'ACTIVE' || touseraccount.status !== 'ACTIVE'){
        return res.status(400).json({
            message:"account is not active",
        })
    }

    // ✅ derive sender balance from ledger
    const balance = await fromuseraccount.getBalance(); // Fix: was fromaccount.getbalance() — fromaccount is just an ID string, fromuseraccount is the actual account object
    if(balance < amount){
        return res.status(400).json({
            message: `insufficient balance. Your available balance is ₹${balance} but you requested ₹${amount}` // Fix: message was using amount twice instead of balance
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

        await (()=>{
            return new Promise((resolve,reject)=>{
                setTimeout(()=>{
                    resolve();
                },10000);
            })
        })()

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

        // ✅ Send success email to recipient
        await emailservice.sendtransferemail(
            touseraccount.user.email,  // recipient's email from populated user
            touseraccount.user.name,   // recipient's name
            amount                     // how much they received
        );

        return res.status(201).json({ // Fixed: missing success response
            message: "Transaction successful",
            transaction: transaction[0],
        })

    } catch (error) { // Fixed: missing try/catch — session would hang forever on error
        await session.abortTransaction();
        session.endSession();

        // ✅ Send failure email to recipient
        await emailservice.sendtransferfailemail(
            touseraccount.user.email,  // recipient's email
            touseraccount.user.name    // recipient's name
        );

        return res.status(500).json({
            message: "Transaction failed",
            error: error.message,
        })
    }
}

module.exports = { createinitialfunds, createtransfer };