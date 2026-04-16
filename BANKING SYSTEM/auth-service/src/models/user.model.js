const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'email is required'],
        trim: true,
        unique: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
        lowercase: true,
    },
    name: {
        type: String,
        required: [true, 'name is required'],
        trim: true,
        minlength: [3, 'name should be at least 3 characters'],
        maxlength: [12, 'name should be at most 12 characters'],
    },
    password: {
        type: String,
        required: [true, 'password is required'],
        minlength: [8, 'password length should be at least 8'],
        select: false,
        match: [
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            'password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
        ]
    },
    systemUser:{
        type:Boolean,
        default:false,
        immutable:true , 
    }
}, { timestamps: true });

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("user", userSchema);
