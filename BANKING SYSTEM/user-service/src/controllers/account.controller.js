const accountmodel = require('../models/account.model.js');
const usermodel = require('../models/user.model.js');
const axios = require('axios'); // The tool we use to "call" other services

/**
 * 1. Create a new account for the logged-in user
 */
async function accountcontroller(req, res) {
    try {
        // req.user was provided by our Bouncer (auth.middleware)
        const account = await accountmodel.create({
            user: req.user._id,
        });

        return res.status(201).json({
            message: "Account created successfully",
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
        // Find the user and "populate" their account info
        // This is like saying: "Find me the user and bring their account files too"
        const account = await accountmodel.find({ user: req.user._id });
        
        if (!account || account.length === 0) {
            return res.status(404).json({ message: "No accounts found for this user" });
        }

        return res.status(200).json({ accounts: account });
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
        // The URL comes from our .env file (TRANSACTION_SERVICE_URL)
        const response = await axios.get(`${process.env.TRANSACTION_SERVICE_URL}/api/transactions/balance/${accountId}`);
        
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
