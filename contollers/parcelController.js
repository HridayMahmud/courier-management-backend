
//parcel controller function
const localizaion = require('../middleware/localizationMiddleware.js');
// const parcelRepo = require('../repository/parcelRepository.js');
const parcelRepo = require('../repository/parcelRepository.js');

//CRUD operation on parcel

//create parcel
const createParcel = async(req,res)=>{
    try{
        const{title,address,userId,weight} = req.body;
        //check existing parcel
        const existingParcel = await parcelRepo.getUser(userId);
        if(existingParcel && existingParcel.title===title && existingParcel.address===address){
            return res.status(400).json({
            message: "Parcel already exists. Cannot create duplicate."
      });
        }

        //create parcel
       const parcel = await parcelRepo.create({title,address,userId,weight});
       res.status(200).json({
        message:`parcel is successfully created , info:${parcel}`
       });
    }catch(error){
        res.status(401).json({
            message:error.message
        });
    }
}

//get myParcel

const getMyParcel = async(req,res)=>{
    const parcel = await parcelRepo.getUser(req.user.id);
    res.json(parcel);
}

//get all parcels
const getAllParcels = async(req,res)=>{
    const parcel = await parcelRepo.getAll();
    res.json(parcel);
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
    return parcel;
}

//parcel update
const updateParcels = async(req,res)=>{
   try{
    const {title,address,weight} = req.body;
    const id = req.params.id;
    if(!await findOwnedParcel(req,res)) return;
    const parcel = await parcelRepo.update(id,{title,address,weight});
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
module.exports = {createParcel,getMyParcel,getAllParcels, updateParcels,deleteParcels}