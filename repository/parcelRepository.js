const Parcel = require('../models/Parcel.js');

    //create parcel
    // create:(data)=>Parcel.create(data),
    const create = async(data)=>{
        return Parcel.create(data);
    }
    //all parcels of one user, newest first
    const getUser = async(userId)=>{
        return Parcel.find({userId}).sort({createdAt:-1});
    }
    const findDuplicate = async(userId,title,address)=>{
        return Parcel.findOne({userId,title,address});
    }
    const getById = async(_id)=>{
        return Parcel.findById(_id);
    }
    const getAll = async()=>{
        return Parcel.find().sort({createdAt:-1}).populate("userId","name email");
    }
    const update = async(_id,data)=>{
        return Parcel.findByIdAndUpdate(_id,data,{new:true, runValidators:true});
    }
    const remove = async(_id)=>{
        return Parcel.findByIdAndDelete(_id);
    }
    // getUser:(userId)=>Parcel.findOne({userId:userId}),
    // getAll:()=>Parcel.find(),
    // update:(id,data)=>Parcel.findByIdAndUpdate(id,data,{new:true}),
    // remove:(id)=>Parcel.findByIdAndDelete(id)
    module.exports = {create,getUser,findDuplicate,getById,getAll,update,remove}
