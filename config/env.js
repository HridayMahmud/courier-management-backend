require('dotenv').config();

//stop early with a clear message instead of crashing later (no db) or failing every login (no secret)
const checkEnv = (required = ["MONGODB_URI","JWT_SECRET"])=>{
    const missing = required.filter((key)=>!process.env[key] || !process.env[key].trim());
    if(missing.length){
        console.error(`\nMissing environment variable(s): ${missing.join(", ")}`);
        console.error("Copy .env.example to .env and fill them in, then start again.\n");
        process.exit(1);
    }
}

module.exports = {checkEnv};
