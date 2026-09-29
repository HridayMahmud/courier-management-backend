const Parcel = require('../models/Parcel.js');

const escapeRegex = (text)=>String(text).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

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
    const getByIdPopulated = async(_id)=>{
        return Parcel.findById(_id)
            .populate("userId","name email")
            .populate("assignedCourier","name email")
            .populate("statusHistory.updatedBy","name role");
    }
    const getByTrackingId = async(trackingId)=>{
        return Parcel.findOne({trackingId});
    }
    const getAll = async()=>{
        return Parcel.find().sort({createdAt:-1}).populate("userId","name email");
    }
    //filter by status, search tracking id / title / receiver / address, paginate
    const search = async({status,search,page=1,limit=10})=>{
        const filter = {};
        if(status) filter.status = status;
        if(search){
            const re = new RegExp(escapeRegex(search),"i");
            filter.$or = [{trackingId:re},{title:re},{receiverName:re},{address:re}];
        }
        const [items,total] = await Promise.all([
            Parcel.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit)
                .populate("userId","name email").populate("assignedCourier","name email"),
            Parcel.countDocuments(filter)
        ]);
        return {items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit))};
    }
    const getAssigned = async(courierId,status)=>{
        const filter = {assignedCourier:courierId};
        if(status) filter.status = status;
        return Parcel.find(filter).sort({updatedAt:-1}).populate("userId","name email");
    }
    const stats = async(days=30)=>{
        const since = new Date();
        since.setUTCHours(0,0,0,0);
        since.setUTCDate(since.getUTCDate()-(days-1));
        const [byStatus,daily,total,recent] = await Promise.all([
            Parcel.aggregate([{$group:{_id:"$status",count:{$sum:1}}}]),
            Parcel.aggregate([
                {$match:{createdAt:{$gte:since}}},
                {$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt"}},count:{$sum:1}}}
            ]),
            Parcel.countDocuments(),
            Parcel.find().sort({createdAt:-1}).limit(5).populate("userId","name email")
        ]);
        return {byStatus,daily,total,recent,since};
    }
    //number of unfinished parcels per courier
    const activeCountByCourier = async()=>{
        return Parcel.aggregate([
            {$match:{assignedCourier:{$ne:null},status:{$nin:["delivered","cancelled"]}}},
            {$group:{_id:"$assignedCourier",count:{$sum:1}}}
        ]);
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
    module.exports = {create,getUser,findDuplicate,getById,getByIdPopulated,getByTrackingId,getAll,search,getAssigned,stats,activeCountByCourier,update,remove}
