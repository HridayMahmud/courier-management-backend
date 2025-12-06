const { emit } = require('../models/Parcel.js');
const User = require('../models/User.js');

// module.exports = {
//     //for creating user
//     create:(data)=>User.create(data),
//     //for finding user is exist or not
//     findByEmail:(email)=>User.findOne({email}),
//     //find user by id and update
//     update:(id,data)=>User.findByIdAndUpdate(id,data, {new:true})
// }
const create = async(data)=>{
    return User.create(data);
}
const findUser = async(email)=>{
    return User.findOne({email});
}
const update = async(id,data)=>{

    return User.findByIdAndUpdate(id,data,{new:true});
}
// Example in userRepo.js
const saveResetToken = async (email, token) => {
    return User.findOneAndUpdate(
        { email },
        { resetToken: token },
        { new: true }
    );
};

module.exports = {create,findUser,update,saveResetToken}