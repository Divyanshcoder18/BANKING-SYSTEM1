const accountmodel = require('../config/Models/account.model.js');
const userModel = require('../config/Models/user.model.js');

async function accountcontroller(req, res) {
    try {
        // req.user will be provided by the auth middleware
        const account = await accountmodel.create({
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

async function getuseraccount(req,res){
    const account = await userModel.findById(req.user._id).populate("account");
    if(!account){
        return res.status(404).json({
            message:"Account not found"
        })
    }
    return res.status(200).json({
        account:account.account
    })
}

async function getbalance(req,res){
    const{accountId} = req.params;
    const account = await accountmodel.findOne({
        _id:accountId,
        user:req.user._id
    })
    if(!account){
        return res.status(404).json({
            message:"Account not found"
        })
    }
    const balance = await account.getBalance();
    return res.status(200).json({
        account:account._id,
        balance:balance  , 
    })

  
}

module.exports = { accountcontroller,getbalance,getuseraccount };
 