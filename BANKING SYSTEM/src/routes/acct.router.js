const express = require("express");
const router = express.Router();
const { accountcontroller } = require("../Controllers/account.controler.js");
const { authmiddleware } = require("../middleware/auth.middleware.js");

// We add authmiddleware before the controller so req.user is set
router.post('/account', authmiddleware, accountcontroller); 

module.exports = router;
