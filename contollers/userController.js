const userRepo = require('../repository/userRepository.js');
const parcelRepo = require('../repository/parcelRepository.js');
const bcrypt = require('bcryptjs');

const ROLES = ["admin","customer","courier"];

//admin: list users, ?role=courier also returns each courier's active parcel count
const listUsers = async(req,res)=>{
    try{
        const {role} = req.query;
        if(role && !ROLES.includes(role)){
            return res.status(400).json({message:"Invalid role"});
        }
        const users = await userRepo.list(role);
        if(role !== "courier"){
            return res.json(users);
        }
        const counts = await parcelRepo.activeCountByCourier();
        const active = Object.fromEntries(counts.map(({_id,count})=>[String(_id),count]));
        res.json(users.map((u)=>({...u.toJSON(), activeParcels:active[String(u._id)] || 0})));
    }catch(error){
        res.status(500).json({message:error.message});
    }
}

//admin: create a courier account
const createCourier = async(req,res)=>{
    try{
        const {name,email,password} = req.body;
        if(!name || !email || !password){
            return res.status(400).json({message:"Name, email & password are required"});
        }
        if(String(password).length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters"});
        }
        const exist = await userRepo.findUser(email);
        if(exist){
            return res.status(400).json({message:"user already exist"});
        }
        const hash = await bcrypt.hash(password,10);
        const user = await userRepo.create({name,email,password:hash,role:"courier"});
        res.status(201).json({message:"Courier created successfully",user});
    }catch(error){
        res.status(400).json({message:error.message});
    }
}

module.exports = {listUsers,createCourier}
