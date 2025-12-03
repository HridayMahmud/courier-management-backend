const Parcel = require('../models/Parcel.js');

    //create parcel 
    // create:(data)=>Parcel.create(data),
    const create = async(data)=>{
        return Parcel.create(data);
    }
    const getUser = async(userId)=>{
        return Parcel.findOne({userId});
    }
    const getAll = async()=>{
        return Parcel.find();
    }
    const update = async(id,data)=>{
        return Parcel.findByIdAndUpdate(id,data,{new:true});
    }
    const remove = async(id)=>{
        return Parcel.findByIdAndDelete(id);
    }
    // getUser:(userId)=>Parcel.findOne({userId:userId}),
    // getAll:()=>Parcel.find(),
    // update:(id,data)=>Parcel.findByIdAndUpdate(id,data,{new:true}),
    // remove:(id)=>Parcel.findByIdAndDelete(id)
    module.exports = {create,getUser,getAll,update,remove}
