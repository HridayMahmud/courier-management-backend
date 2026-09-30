const mongoose = require('mongoose');
const crypto = require('crypto');

//delivery flow, cancelled can happen from pending
const STATUSES = ["pending","picked_up","in_transit","out_for_delivery","delivered","cancelled"];

//no 0/O or 1/I so tracking ids are easy to read out loud
const TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateTrackingId = ()=>{
    let id = "";
    for(const byte of crypto.randomBytes(8)) id += TRACKING_ALPHABET[byte % TRACKING_ALPHABET.length];
    return `SS-${id}`;
}

const statusHistorySchema = new mongoose.Schema({
    status:{type:String, enum:STATUSES, required:true},
    note:{type:String, default:""},
    updatedBy:{type:mongoose.Schema.Types.ObjectId, ref:"User"},
    at:{type:Date, default:Date.now}
},{_id:false});

const parcelSchema = new mongoose.Schema({
    userId:
    {type:mongoose.Schema.Types.ObjectId,
    ref:"User", required:true},
    //sparse so parcels created before tracking ids existed don't clash until backfilled
    trackingId:{type:String, unique:true, sparse:true},
    title:{type:String, required:true, trim:true},
    status:{type:String, enum:STATUSES, default:"pending"},
    //delivery address
    address:{type:String, required:true, trim:true},
    pickupAddress:{type:String, trim:true},
    receiverName:{type:String, trim:true},
    receiverPhone:{type:String, trim:true},
    //kg
    weight:{type:Number, min:0},
    assignedCourier:{type:mongoose.Schema.Types.ObjectId, ref:"User", default:null},
    statusHistory:{type:[statusHistorySchema], default:[]}
},{timestamps:true});

parcelSchema.pre("validate", function(){
    if(!this.trackingId) this.trackingId = generateTrackingId();
    if(this.isNew && this.statusHistory.length === 0){
        this.statusHistory.push({status:this.status, note:"Parcel created", updatedBy:this.userId});
    }
});

module.exports = mongoose.model("Parcel",parcelSchema);
module.exports.STATUSES = STATUSES;
module.exports.generateTrackingId = generateTrackingId;
