const express = require('express');
const jwt = require('jsonwebtoken');
const usermodel = require('../config/Models/user.model.js');
const { sendregiseremail } = require('../services/email.services.js');

const userregistercontroller = async (req, res) => {
    const { email, password, name } = req.body;

    const isexist = await usermodel.findOne({ email });
    if (isexist) {
        return res.status(402).json({
            success: false,
            message: "user already exist",

        })


    }
    const user = await usermodel.create({
        email,
        password,
        name,

    })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24d" })
    res.cookie("token", token);

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
        },
        token,

    })
    await sendregiseremail(user.email,user.name) ; 

}

const userlogincontroller =  async (req,res)=>{
    const {email,password} = req.body ;
    const user = await usermodel.findOne({email}).select("+password") ;

    if(!user){
       return  res.status(401).json({
            success:false , 
            message:"email is not working" ,

        })
    }

    const ispassword  =  await user.comparePassword(password)
    if(!ispassword){
        return res.status(401).json({
           success: false,
           message: "Email and Password u entered is wrong" , 
        })
    }

   const token   = jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:"24d"})
   res.cookie("token",token);

  return  res.status(200).json({

    user: {
    _id:user._id,
    email: user.email,
    name:user.name , 
    }

   })

} 
module.exports = { userregistercontroller ,userlogincontroller};
