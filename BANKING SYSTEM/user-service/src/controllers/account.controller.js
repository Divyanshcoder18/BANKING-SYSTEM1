const accountmodel = require('../models/account.model.js');
const usermodel = require('../models/user.model.js');
const axios = require('axios'); // The tool we use to "call" other services

/**
 * 1. Create a new account for the logged-in user
 */
async function accountcontroller(req, res) {
    try {
        const { accountType, nickname } = req.body;

        // 1. Create the account in our database
        const account = await accountmodel.create({
            user: req.user._id,
            accountType: accountType || "SAVINGS",
            nickname: nickname || ""
        });

        // 2. THE SIGNUP BONUS! (Microservice call)
        // We automatically "deposit" $500 into the new account to welcome the user.
        try {
            await axios.post(`${process.env.TRANSACTION_SERVICE_URL}/api/transaction/deposit`, {
                accountId: account._id,
                amount: 500, // The $500 Welcome Bonus
                idempotencyKey: `bonus-${account._id}`, // Ensures we only give the bonus ONCE per account
                email: req.user.email
            }, {
                // We pass the user's token so the transaction service knows it's authorized
                headers: { Authorization: req.headers.authorization }
            });
            console.log(`[BONUS] $500 deposited into new account ${account._id}`);
        } catch (bonusError) {
            // We don't want to CRASH the whole account creation if the bonus service is down
            console.error("[BONUS ERROR]", bonusError.message);
        }

        return res.status(201).json({
            message: "Account created successfully with $500 bonus!",
            account
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error creating account",
            error: error.message
        });
    }
}

/**
 * 2. Get the account details for the logged-in user
 */
async function getuseraccount(req, res) {
    try {
        // Find the user's accounts
        const accounts = await accountmodel.find({ user: req.user._id });
        
        if (!accounts || accounts.length === 0) {
            return res.status(404).json({ message: "No accounts found for this user" });
        }

        // --- THE MICROSERVICE CALL (BATCH) ---
        // For each account, we ask the Transaction Service for the balance.
        // We use Promise.all to do this quickly in parallel.
        const accountsWithBalances = await Promise.all(accounts.map(async (acc) => {
            try {
                // We use the singular '/api/transaction/balance' to match the other service
                const response = await axios.get(`${process.env.TRANSACTION_SERVICE_URL}/api/transaction/balance/${acc._id}`);
                return {
                    ...acc.toObject(),
                    balance: response.data.balance
                };
            } catch (err) {
                console.error(`Balance fetch failed for account ${acc._id}:`, err.message);
                return {
                    ...acc.toObject(),
                    balance: 0 // Default to 0 if service is down
                };
            }
        }));

        return res.status(200).json({ accounts: accountsWithBalances });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching accounts", error: error.message });
    }
}

/**
 * 3. Get the balance (The Microservice way!)
 */
async function getbalance(req, res) {
    try {
        const { accountId } = req.params;

        // Verify that THIS account belongs to THIS user first
        const account = await accountmodel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({ message: "Account not found or access denied" });
        }

        // --- THE MICROSERVICE CALL ---
        // We call the Transaction Service to get the actual balance
        // We ensure we use the singular '/api/transaction'
        const response = await axios.get(`${process.env.TRANSACTION_SERVICE_URL}/api/transaction/balance/${accountId}`);
        
        const balance = response.data.balance;

        //Now that we have the answer from the Transaction Service, we finally answer our own user.
        //We send a 200 OK status and a nice JSON package with the Account ID and the Balance we just found.

        return res.status(200).json({
            accountId: account._id,
            balance: balance
        });
    } catch (error) {
        // If the transaction service is down or there's an error
        return res.status(500).json({
            message: "Error fetching balance from Transaction Service",
            error: error.message
        });
    }
}
module.exports = { accountcontroller, getuseraccount, getbalance };
