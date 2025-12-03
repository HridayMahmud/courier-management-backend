const mongoose = require('mongoose');
require('dotenv').config();
const databaseConnection = async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("mongodb is connected");
    }
    catch(error){
        console.log(error);
        process.exit(1);
    }

}
module.exports = databaseConnection;