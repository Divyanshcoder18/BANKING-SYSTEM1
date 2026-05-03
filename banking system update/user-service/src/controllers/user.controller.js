const userModel = require('../models/user.model.js');

async function getUserByVPA(req, res) {
    try {
        const { vpa } = req.params;

        if (!vpa) {
            return res.status(400).json({ success: false, message: "VPA is required" });
        }

        // Search for user by VPA and only return the name field
        const user = await userModel.findOne({ vpa: vpa.toLowerCase() }).select('name');

        if (!user) {
            return res.status(404).json({ success: false, message: "Recipient not found" });
        }

        res.status(200).json({ 
            success: true, 
            name: user.name 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { getUserByVPA };
