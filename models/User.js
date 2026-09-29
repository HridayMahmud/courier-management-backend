const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:{type:String,required:true},

  email:{type:String,unique:true},

  password:{type:String,required:true},

  role:{
    type:String, 
    enum:["admin","customer","courier"],
    default:"customer"
  },
  //sha256 hash of the reset token, never the raw token
  resetToken:{
    type:String,default:null
  },
  resetTokenExpires:{
    type:Date,default:null
  }


},{
  timestamps:true,
  //never send password or reset token data in API responses
  toJSON:{
    transform:(doc,ret)=>{
      delete ret.password;
      delete ret.resetToken;
      delete ret.resetTokenExpires;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model("User",UserSchema);
