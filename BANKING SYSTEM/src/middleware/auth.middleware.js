const express = require('express');
const jwt = require('jsonwebtoken'); // Added missing JWT import
const usermodel = require('../config/Models/user.model.js'); // Added missing user model import

async function authmiddleware(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ // Fixed res.status.json to res.status(401).json
            message: "unauthorized access",
        });
    }

    try {
        // Changed JWT_secret to JWT_SECRET to match controller
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        
        // Fixed findone -> findOne, and decoded.user_id -> _id: decoded.id
        const user = await usermodel.findOne({ _id: decoded.id });
        
        if (!user) {
            return res.status(401).json({
                message: "unauthorized access",
            });
        }

        req.user = user;
        next(); 
    } catch (error) {
        return res.status(401).json({
            message: "unauthorized access", 
        });
    }
}

async function authsystemmiddleware(req,res,next){
    const token  = req.cookies.token ; 
    if(!token){
        return res.status(401).json({
            message:"unauthorized access", 

        })
    }
    try{
        const decoded=  jwt.verify(token,process.env.JWT_SECRET);
        const user = await usermodel.findOne({_id:decoded.id}).select("+systemUser");

        if(!user){
            return res.status(401).json({
                message:"unauathorized access", 
            })
        }
        if(!user.systemUser){
            return res.status(401).json({
                message:"unauathorized access", 
            })
        }
        req.user = user;
        next();
    }catch(error){
        return res.status(401).json({
            message:"unauthorized access", 
        })
    }

}

// Fixed module.export to module.exports
module.exports = { authmiddleware,authsystemmiddleware };
