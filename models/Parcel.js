const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema({
    userId:
    {type:mongoose.Schema.Types.ObjectId, 
    ref:"User"},
    title:{type:String},
    status:{type:String, default:"pending"},
    address:{type:String},
    weight:{type:String}
},{timestamps:true});
module.exports = mongoose.model("Parcel",parcelSchema);
