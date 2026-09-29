//One-time migration for data created before tracking ids existed.
//  node scripts/backfill-tracking-ids.js            apply changes
//  node scripts/backfill-tracking-ids.js --dry-run  only report what would change
//Safe to run more than once: already migrated documents are skipped.
//
//Parcels: adds trackingId, converts weight text ("2kg") to a number, sets a missing
//status to pending and adds the first statusHistory entry.
//Users: clears reset tokens saved by the old plain-text flow (they can't be used anymore).
require('dotenv').config();
const mongoose = require('mongoose');
const { STATUSES, generateTrackingId } = require('../models/Parcel.js');

const DRY_RUN = process.argv.includes('--dry-run');

const run = async()=>{
    if(!process.env.MONGODB_URI){
        throw new Error("MONGODB_URI is not set");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const parcels = mongoose.connection.collection("parcels");
    const users = mongoose.connection.collection("users");

    let updated = 0, badWeight = 0;
    const unknownStatus = [];
    const cursor = parcels.find({$or:[
        {trackingId:{$exists:false}},
        {trackingId:null},
        {weight:{$type:"string"}},
        {status:{$exists:false}},
        {statusHistory:{$exists:false}},
        {statusHistory:{$size:0}}
    ]});

    for await (const parcel of cursor){
        const set = {}, unset = {};
        if(!parcel.trackingId){
            //retry on the tiny chance of a collision
            let id;
            do { id = generateTrackingId(); } while(await parcels.findOne({trackingId:id}));
            set.trackingId = id;
        }
        if(typeof parcel.weight === "string"){
            const kg = parseFloat(parcel.weight);
            if(Number.isFinite(kg) && kg >= 0) set.weight = kg;
            else { unset.weight = ""; badWeight++; }
        }
        const status = parcel.status || "pending";
        if(!parcel.status) set.status = status;
        if(!STATUSES.includes(status)) unknownStatus.push(`${parcel._id} (${status})`);
        if(!Array.isArray(parcel.statusHistory) || parcel.statusHistory.length === 0){
            set.statusHistory = [{
                status: STATUSES.includes(status) ? status : "pending",
                note:"Imported",
                updatedBy:parcel.userId,
                at:parcel.createdAt || new Date()
            }];
        }
        const update = {};
        if(Object.keys(set).length) update.$set = set;
        if(Object.keys(unset).length) update.$unset = unset;
        if(!Object.keys(update).length) continue;
        updated++;
        if(DRY_RUN) console.log(parcel._id.toString(), JSON.stringify(update));
        else await parcels.updateOne({_id:parcel._id}, update);
    }

    const oldTokens = {resetToken:{$ne:null}, resetTokenExpires:{$exists:false}};
    const tokenCount = await users.countDocuments(oldTokens);
    if(!DRY_RUN && tokenCount) await users.updateMany(oldTokens,{$set:{resetToken:null, resetTokenExpires:null}});

    console.log(`${DRY_RUN ? "[dry run] would update" : "updated"} ${updated} parcel(s)`);
    if(badWeight) console.log(`${badWeight} parcel(s) had a weight that is not a number, it was removed`);
    if(unknownStatus.length) console.log(`parcels with an unknown status, please fix by hand: ${unknownStatus.join(", ")}`);
    console.log(`${DRY_RUN ? "[dry run] would clear" : "cleared"} ${tokenCount} old reset token(s)`);
}

run()
    .catch((error)=>{ console.error(error.message); process.exitCode = 1; })
    .finally(()=>mongoose.disconnect());
