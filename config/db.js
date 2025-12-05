const mongoose = require('mongoose');

const databaseConnection = async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("mongodb is connected");
    }
    catch(error){
        console.log(error);
        process.exit(1);
    }

}
module.exports = databaseConnection;