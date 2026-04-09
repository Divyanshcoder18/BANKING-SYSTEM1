const express = require('express');
const { userregistercontroller, userlogincontroller } = require('../Controllers/auth.controler.js');

const router = express.Router();

router.post('/register', userregistercontroller);
router.post('/login',userlogincontroller); 

module.exports = router;
