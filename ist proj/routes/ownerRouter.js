const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");

// Create owner route — allowed only in development
router.post("/create", async (req, res) => {

    if (process.env.NODE_ENV !== "development") {
        return res.status(403).send("Not allowed in production mode");
    }

    let existing = await ownerModel.find();
    if (existing.length > 0) {
        return res.send("Owners cannot be more than 1");
    }

    let { fullname, email, password } = req.body;

    await ownerModel.create({
        fullname,
        email,
        password
    });

    res.send("Owner created successfully!");
});

module.exports = router;
