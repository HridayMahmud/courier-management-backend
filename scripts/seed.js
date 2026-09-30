//Creates the first admin (from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD in .env).
//  npm run seed         admin only
//  npm run seed:demo    admin (if set) + demo accounts and sample parcels, for local testing
//Safe to run more than once: existing accounts are kept, demo parcels are only added once.
require('dotenv').config();
const { checkEnv } = require('../config/env.js');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User.js');
const Parcel = require('../models/Parcel.js');

const DEMO = process.argv.includes('--demo');

const DEMO_USERS = {
    admin: { name:"Ayesha Rahman", email:"admin@swiftship.test", password:"Admin@123", role:"admin" },
    courier: { name:"Rafiq Hasan", email:"courier@swiftship.test", password:"Courier@123", role:"courier" },
    courier2: { name:"Tanvir Ahmed", email:"courier2@swiftship.test", password:"Courier@123", role:"courier" },
    customer: { name:"Nusrat Jahan", email:"customer@swiftship.test", password:"Customer@123", role:"customer" },
    customer2: { name:"Imran Hossain", email:"imran@swiftship.test", password:"Customer@123", role:"customer" },
};

//[owner, courier, title, delivery address, pickup address, receiver, phone, kg, statuses reached after pending]
const DEMO_PARCELS = [
    ["customer","courier","MacBook Air M3","House 12, Road 5, Dhanmondi, Dhaka","Agrabad C/A, Chattogram","Sadia Karim","01711234567",1.4,["picked_up","in_transit","out_for_delivery","delivered"]],
    ["customer","courier","Wedding gift box","Zindabazar, Sylhet","Gulshan 2, Dhaka","Farhana Akter","01819555111",3.2,["picked_up","in_transit"]],
    ["customer","courier2","Documents (legal)","Sonadanga, Khulna","Motijheel, Dhaka","Abdul Malek","01912000321",0.3,["picked_up","in_transit","out_for_delivery"]],
    ["customer",null,"Handloom saree","Shaheb Bazar, Rajshahi","Mirpur 10, Dhaka","Rokeya Begum","01556778899",0.8,[]],
    ["customer",null,"Bluetooth speaker","Kandirpar, Cumilla","Uttara Sector 7, Dhaka","Mahin Chowdhury","01633121212",1.1,["cancelled"]],
    ["customer2","courier2","Office chair","Banani, Dhaka","Tongi, Gazipur","Imran Hossain","01722445566",12,["picked_up"]],
    ["customer2","courier","Books (set of 6)","Nasirabad, Chattogram","Nilkhet, Dhaka","Tahmid Islam","01888909090",4.5,[]],
    ["customer2","courier2","Camera lens","Laldighi, Rangpur","Elephant Road, Dhaka","Shirin Sultana","01977343434",0.9,["picked_up","in_transit","out_for_delivery","delivered"]],
];
const NOTES = { picked_up:"Picked up from sender", in_transit:"Left the sorting hub", out_for_delivery:"Rider is on the way", delivered:"Handed to receiver", cancelled:"Ordered by mistake" };

//create the account if it doesn't exist; an existing account keeps its password and gets the role
const ensureUser = async({name,email,password,role})=>{
    const existing = await User.findOne({email:email.toLowerCase()});
    if(existing){
        if(existing.role !== role){
            existing.role = role;
            await existing.save();
            console.log(`  ${email}: already existed, role set to ${role}`);
        }else{
            console.log(`  ${email}: already exists (${role})`);
        }
        return existing;
    }
    const user = await User.create({name,email,password:await bcrypt.hash(password,10),role});
    console.log(`  ${user.email}: created (${role})`);
    return user;
}

const seedDemoParcels = async(users)=>{
    const owners = [users.customer._id, users.customer2._id];
    if(await Parcel.countDocuments({userId:{$in:owners}})){
        console.log("  demo parcels already exist, skipped");
        return;
    }
    const day = 24*60*60*1000, hour = 60*60*1000;
    for(const [i,[owner,courier,title,address,pickupAddress,receiverName,receiverPhone,weight,steps]] of DEMO_PARCELS.entries()){
        const createdAt = new Date(Date.now() - (DEMO_PARCELS.length - i) * 2.5 * day);
        const courierUser = courier ? users[courier] : null;
        const history = [{status:"pending", note:"Parcel created", updatedBy:users[owner]._id, at:createdAt}];
        steps.forEach((status,j)=>history.push({
            status,
            note:NOTES[status],
            updatedBy:status === "cancelled" ? users[owner]._id : courierUser._id,
            at:new Date(createdAt.getTime() + (j + 1) * 9 * hour)
        }));
        const parcel = await Parcel.create({
            userId:users[owner]._id, title, address, pickupAddress, receiverName, receiverPhone, weight,
            status:history.at(-1).status,
            assignedCourier:courierUser?._id ?? null,
            statusHistory:history
        });
        //backdate so lists and the 30-day chart look realistic
        await Parcel.collection.updateOne({_id:parcel._id},{$set:{createdAt, updatedAt:history.at(-1).at}});
    }
    console.log(`  ${DEMO_PARCELS.length} demo parcels created`);
}

const run = async()=>{
    checkEnv(["MONGODB_URI"]);
    if(DEMO && process.env.NODE_ENV === "production"){
        throw new Error("Refusing to add demo data with NODE_ENV=production");
    }
    const {ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD} = process.env;
    if(!DEMO && !(ADMIN_EMAIL && ADMIN_PASSWORD)){
        throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (see .env.example), then run again");
    }
    if(ADMIN_PASSWORD && ADMIN_PASSWORD.length < 6){
        throw new Error("ADMIN_PASSWORD must be at least 6 characters");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Seeding:");
    if(ADMIN_EMAIL && ADMIN_PASSWORD){
        await ensureUser({name:ADMIN_NAME || "Admin", email:ADMIN_EMAIL, password:ADMIN_PASSWORD, role:"admin"});
    }
    if(DEMO){
        const users = {};
        for(const [key,data] of Object.entries(DEMO_USERS)) users[key] = await ensureUser(data);
        await seedDemoParcels(users);
        console.log("\nDemo logins:");
        for(const u of Object.values(DEMO_USERS)) console.log(`  ${u.role.padEnd(8)} ${u.email.padEnd(26)} ${u.password}`);
    }
    console.log("Done.");
}

run()
    .catch((error)=>{ console.error(`\nSeed failed: ${error.message}`); process.exitCode = 1; })
    .finally(()=>mongoose.disconnect());
