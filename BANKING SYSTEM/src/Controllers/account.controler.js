const acctmodel = require('../config/Models/accont.model.js');

async function accountcontroller(req, res) {
    try {
        // req.user will be provided by the auth middleware
        const account = await acctmodel.create({
            user: req.user._id,
        });

        return res.status(201).json({
            account
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error creating account",
            error: error.message
        });
    }
}

module.exports = { accountcontroller };
