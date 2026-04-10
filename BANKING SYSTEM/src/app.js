const express = require('express');
const cookieParser = require('cookie-parser');


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser()); 

//The require() command reaches into those remote files, grabs the specific "Router Object" you built there, and stores it in variables (acctRouter and authRouter
const acctRouter = require('./routes/acct.router.js');
const authRouter = require('./routes/auth.router.js'); 
const transactionRouter = require('./routes/transaction.router.js');


//app.use() connects a specific URL path to the "mini-app" you imported. It acts like a fork in the road:

app.use("/api/auth", authRouter);
app.use("/api/account", acctRouter);
app.use("/api/transaction", transactionRouter);



 module.exports = app;




