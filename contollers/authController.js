const userRepo = require('../repository/userRepository.js');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {Resend} = require('resend');
// const mailTransport = require('../config/mail.js');
const resend = new Resend(process.env.RESEND_API_KEY);
const crypto = require('crypto');
const { waitForDebugger } = require('inspector');

//user registration
const registration = async(req,res)=>{
    try{
        const{name,email,password,role} = req.body;
        const exist = await userRepo.findUser(email);
        if(exist){
            return res.status(400).json({
                message:"user already exist"
            });
        }
        //making hash password
        const hash = await bcrypt.hash(password,10);
        //register user
        const User = await userRepo.create({
            name,email,password:hash,role
        });
        
        res.json({
            message:"user regitered successfully",User
        });

    }
    catch(error){
        return res.status(400).json({
            message:error.message
        });
    }
}

//login user
const login = async(req,res)=>{
    try{
        const{email,password} = req.body;
        const user = await userRepo.findUser(email);
        if(!user){
            return res.status(404).json({
                message:"USER NOT FOUND"
            });
        }
        const match = await bcrypt.compare(password,user.password);
        if(!match){
            return res.status(403).json({
                message:"Wrong Password"
            });
        }
        const token = jwt.sign({id:user._id, role:user.role}, process.env.JWT_SECRET,{expiresIn:"1d"});
        res.status(200).json({user:user.role,token,message:req.t("login_success")});
    }
    catch(error){
        return res.status(403).json({message:error.message});
    }
}

// const updateUser = async(req,res)=>{
//     try{
//         const {name,email,role,password} = req.body;
      
//         const existUser = await userRepo.findUser(email);
//         if(!existUser){
//             return res.status(404).json({message:"User Not Found"});
//         }
//         const token = crypto.randomBytes(20).toString("hex");
//         const user = await userRepo.update(user._id,{name,password,role,resetToken:token});
//         res.json(user)
        
//     }catch(error){

//     }
// }

//forgot password
const forgotPassword = async(req,res)=>{
    try{
        const { email }= req.body;
        const user = await userRepo.findUser(email);
        if(!user){
            return res.status(404).json({
                message:"User NOT Found"
            });
        }
        // const token = crypto.randomBytes(20).toString("hex");
        const ResetToken = Math.floor(100000 + Math.random * 900000).toString();
        //Save resetToken to your database
        await userRepo.saveResetTOken(email,ResetToken);
        // await userRepo.update(user._id,{resetToken : token});
        // // const resetLink = `http://localhost:${5000}/reset-password?email=${encodeURIComponent(user.email)}&token=${token}`
        // await mailTransport.sendMail({
        //     to:user.email,
        //     subject:"password reset",
        //     html:`<p>please collect your reset token:${token}</p>
        //     `
        // });
        //send mail to user to reset password
        await resend.emails.send({
            from: "no-reply@gmail.com",
            to: email,
            subject: "password reset request",
            html: `<h1>your token to reset password</h1>
            <p>User this token to reset password</p>
            <h2>your resetToken is : ${ResetToken}
            <p>It will expire within 10 minutes</p>
            `
        })
        res.json({
            message:"email sent"
        })
    }catch(error){
        res.status(403).json({
            message:error.message
        });
    }
}



const resetPassword = async (req, res) => {
  try {
    const { email, token, password } = req.body;


      // 1. Validate body
    if (!email || !token || !password) {
      return res.status(400).json({
        message: "Email, token & new password are required"
      });
    }
    // Find user by email and token
    //here email have to sent as string not object
    const user = await userRepo.findUser(email);
     // 3. Check stored resetToken
    if (!user.resetToken) {
      return res.status(400).json({ message: "No reset request found" });
    }
   
      if(user.resetToken !== token){
        return res.status(403).json({
            message:"Invalid token"
        });
      }
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and remove token
    await userRepo.update(user._id, {
      password: hashedPassword,
      resetToken: null
    });

   
    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {registration,login,forgotPassword,resetPassword}