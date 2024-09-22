
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {type: String,required: true, },
    password: {type: String,},
    email: {type: String,required: true,unique: true},
    phone: {type: String,required: false },
    googleId: {type: String,},
    is_blocked : {type : Number,default : 0},
    is_admin : {type : Number,default : 0
    },is_verifyed: {
        type : Number,
        default : 0
    },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
     wallet: { 
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
  } 
  
});

module.exports = mongoose.model('User', userSchema);