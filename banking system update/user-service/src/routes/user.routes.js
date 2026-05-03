const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller.js');

// Route to lookup user name by VPA (UPI ID)
router.get('/vpa/:vpa', userController.getUserByVPA);

module.exports = router;
