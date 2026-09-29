
//parcel controller function
const localizaion = require('../middleware/localizationMiddleware.js');
// const parcelRepo = require('../repository/parcelRepository.js');
const parcelRepo = require('../repository/parcelRepository.js');
const userRepo = require('../repository/userRepository.js');
const { STATUSES } = require('../models/Parcel.js');

//order a courier moves a parcel through, cancelled is only set by admin or customer
const DELIVERY_FLOW = ["pending","picked_up","in_transit","out_for_delivery","delivered"];
const FINAL_STATUSES = ["delivered","cancelled"];
const isAssignedCourier = (parcel,user)=>{
    const courierId = parcel.assignedCourier?._id || parcel.assignedCourier;
    return user.role === "courier" && courierId && String(courierId) === String(user.id);
}
const ownerId = (parcel)=>String(parcel.userId?._id || parcel.userId);

//CRUD operation on parcel

//create parcel
const createParcel = async(req,res)=>{
    try{
        const{title,address,weight,pickupAddress,receiverName,receiverPhone} = req.body;
        //owner always comes from the token, never from the body
        const userId = req.user.id;
        //check existing parcel
        const existingParcel = await parcelRepo.findDuplicate(userId,title,address);
        if(existingParcel){
            return res.status(400).json({
            message: "Parcel already exists. Cannot create duplicate."
      });
        }

        //create parcel
       const parcel = await parcelRepo.create({title,address,userId,weight,pickupAddress,receiverName,receiverPhone});
       res.status(201).json({
        message:"Parcel created successfully",parcel
       });
    }catch(error){
        res.status(400).json({
            message:error.message
        });
    }
}

//get myParcel

const getMyParcel = async(req,res)=>{
    try{
        const parcel = await parcelRepo.getUser(req.user.id);
        res.json(parcel);
    }catch(error){
        res.status(500).json({message:error.message});
    }
}

//get all parcels
//without ?page the old plain array is returned, with ?page/limit/status/search a paginated object
const getAllParcels = async(req,res)=>{
    try{
        const {page,limit,status,search} = req.query;
        if(page || limit || status || search){
            if(status && !STATUSES.includes(status)){
                return res.status(400).json({message:"Invalid status"});
            }
            const result = await parcelRepo.search({
                status,
                search: search ? String(search).trim() : undefined,
                page: Math.max(1, parseInt(page) || 1),
                limit: Math.min(100, Math.max(1, parseInt(limit) || 10))
            });
            return res.json(result);
        }
        const parcel = await parcelRepo.getAll();
        res.json(parcel);
    }catch(error){
        res.status(500).json({message:error.message});
    }
}

//only the parcel owner or an admin can change a parcel
const findOwnedParcel = async(req,res)=>{
    const parcel = await parcelRepo.getById(req.params.id);
    if(!parcel){
        res.status(404).json({message:"Parcel not found"});
        return null;
    }
    if(req.user.role !== "admin" && String(parcel.userId) !== String(req.user.id)){
        res.status(403).json({message:"no permissions"});
        return null;
    }
    //customers can only change a parcel before it is picked up
    if(req.user.role !== "admin" && parcel.status !== "pending"){
        res.status(400).json({message:"Parcel can only be changed while it is pending"});
        return null;
    }
    return parcel;
}

//parcel update
const updateParcels = async(req,res)=>{
   try{
    const {title,address,weight,pickupAddress,receiverName,receiverPhone} = req.body;
    const id = req.params.id;
    if(!await findOwnedParcel(req,res)) return;
    const parcel = await parcelRepo.update(id,{title,address,weight,pickupAddress,receiverName,receiverPhone});
    res.status(200).json({message:"Parcel updated successfully",parcel});
   }catch(error){
    res.status(400).json({
        message:error.message
    });
   }
}

//delete or remove parcel
const deleteParcels = async(req,res)=>{
    try{
        const id = req.params.id;
        if(!await findOwnedParcel(req,res)) return;
        const parcel = await parcelRepo.remove(id);
        res.status(200).json({message:"parcel deleted successfully"});
    }catch(error){
        res.status(400).json({message:error.message});
    }
}
//parcel details: owner, admin or the assigned courier
const getParcelById = async(req,res)=>{
    try{
        const parcel = await parcelRepo.getByIdPopulated(req.params.id);
        if(!parcel){
            return res.status(404).json({message:"Parcel not found"});
        }
        const allowed = req.user.role === "admin"
            || ownerId(parcel) === String(req.user.id)
            || isAssignedCourier(parcel,req.user);
        if(!allowed){
            return res.status(403).json({message:"no permissions"});
        }
        res.json(parcel);
    }catch(error){
        res.status(400).json({message:error.message});
    }
}

//public tracking, no addresses, phone or names
const trackParcel = async(req,res)=>{
    try{
        const trackingId = String(req.params.trackingId || "").trim().toUpperCase();
        const parcel = await parcelRepo.getByTrackingId(trackingId);
        if(!parcel){
            return res.status(404).json({message:"No parcel found with this tracking ID"});
        }
        res.json({
            trackingId:parcel.trackingId,
            status:parcel.status,
            weight:parcel.weight,
            createdAt:parcel.createdAt,
            updatedAt:parcel.updatedAt,
            statusHistory:parcel.statusHistory.map(({status,note,at})=>({status,note,at}))
        });
    }catch(error){
        res.status(500).json({message:error.message});
    }
}

//admin: any status change, assigned courier: only forward along the delivery flow
const updateStatus = async(req,res)=>{
    try{
        const {status,note} = req.body;
        if(!STATUSES.includes(status)){
            return res.status(400).json({message:"Invalid status"});
        }
        const parcel = await parcelRepo.getById(req.params.id);
        if(!parcel){
            return res.status(404).json({message:"Parcel not found"});
        }
        if(req.user.role === "courier"){
            if(!isAssignedCourier(parcel,req.user)){
                return res.status(403).json({message:"This parcel is not assigned to you"});
            }
            if(FINAL_STATUSES.includes(parcel.status)){
                return res.status(400).json({message:`Parcel is already ${parcel.status}`});
            }
            if(DELIVERY_FLOW.indexOf(status) <= DELIVERY_FLOW.indexOf(parcel.status)){
                return res.status(400).json({message:"Courier can only move a parcel forward"});
            }
        }
        if(status === parcel.status){
            return res.status(400).json({message:`Parcel is already ${status}`});
        }
        parcel.status = status;
        parcel.statusHistory.push({status, note:note ? String(note).trim() : "", updatedBy:req.user.id, at:new Date()});
        await parcel.save();
        res.json({message:"Status updated successfully",parcel});
    }catch(error){
        res.status(400).json({message:error.message});
    }
}

//admin assigns (or with courierId null, unassigns) a courier
const assignCourier = async(req,res)=>{
    try{
        const {courierId} = req.body;
        const parcel = await parcelRepo.getById(req.params.id);
        if(!parcel){
            return res.status(404).json({message:"Parcel not found"});
        }
        if(FINAL_STATUSES.includes(parcel.status)){
            return res.status(400).json({message:`Parcel is already ${parcel.status}`});
        }
        if(courierId){
            const courier = await userRepo.findById(courierId);
            if(!courier || courier.role !== "courier"){
                return res.status(400).json({message:"Courier not found"});
            }
        }
        parcel.assignedCourier = courierId || null;
        await parcel.save();
        await parcel.populate("assignedCourier","name email");
        res.json({message:courierId ? "Courier assigned successfully" : "Courier unassigned",parcel});
    }catch(error){
        res.status(400).json({message:error.message});
    }
}

//owner cancels while the parcel is still pending
const cancelParcel = async(req,res)=>{
    try{
        const parcel = await parcelRepo.getById(req.params.id);
        if(!parcel){
            return res.status(404).json({message:"Parcel not found"});
        }
        if(ownerId(parcel) !== String(req.user.id)){
            return res.status(403).json({message:"no permissions"});
        }
        if(parcel.status !== "pending"){
            return res.status(400).json({message:"Only pending parcels can be cancelled"});
        }
        parcel.status = "cancelled";
        parcel.statusHistory.push({status:"cancelled", note:req.body?.reason ? String(req.body.reason).trim() : "Cancelled by customer", updatedBy:req.user.id, at:new Date()});
        await parcel.save();
        res.json({message:"Parcel cancelled",parcel});
    }catch(error){
        res.status(400).json({message:error.message});
    }
}

//parcels assigned to the logged-in courier
const getAssignedParcels = async(req,res)=>{
    try{
        const {status} = req.query;
        if(status && !STATUSES.includes(status)){
            return res.status(400).json({message:"Invalid status"});
        }
        const parcels = await parcelRepo.getAssigned(req.user.id,status);
        res.json(parcels);
    }catch(error){
        res.status(500).json({message:error.message});
    }
}

//admin dashboard numbers
const getStats = async(req,res)=>{
    try{
        const days = 30;
        const [data,users] = await Promise.all([parcelRepo.stats(days),userRepo.countByRole()]);
        const byStatus = Object.fromEntries(STATUSES.map((s)=>[s,0]));
        data.byStatus.forEach(({_id,count})=>{ if(_id in byStatus) byStatus[_id] = count; });
        const perDay = Object.fromEntries(data.daily.map(({_id,count})=>[_id,count]));
        const daily = [];
        for(let i=0;i<days;i++){
            const d = new Date(data.since);
            d.setUTCDate(d.getUTCDate()+i);
            const key = d.toISOString().slice(0,10);
            daily.push({date:key,count:perDay[key] || 0});
        }
        const roles = Object.fromEntries(users.map(({_id,count})=>[_id,count]));
        res.json({
            total:data.total,
            byStatus,
            daily,
            users:{customers:roles.customer || 0, couriers:roles.courier || 0, admins:roles.admin || 0},
            recent:data.recent
        });
    }catch(error){
        res.status(500).json({message:error.message});
    }
}

module.exports = {createParcel,getMyParcel,getAllParcels, updateParcels,deleteParcels,getParcelById,trackParcel,updateStatus,assignCourier,cancelParcel,getAssignedParcels,getStats}