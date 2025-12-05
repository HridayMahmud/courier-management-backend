const express = require('express');
const userRoutes = require('./routes/authRouter.js');
const parcelRoutes = require('./routes/parcelsRouter.js');
const db_connection = require('./config/db.js');
const { i18nMiddleware, i18next } = require('./i18n/i18n.js');
const cors = require('cors');
const app = express();
require('dotenv').config();


//middleware to parse json
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(i18nMiddleware.handle(i18next));

//routes
app.get("/",(req,res)=>{
    res.send("api working");
});
app.use("/api/auth", userRoutes);
app.use("/api/parcel", parcelRoutes);

//db connection
const startServer = async () => {
    try {
        await db_connection();
        console.log("database connected successfully");

        const PORT = process.env.PORT || 4000;
        app.listen(PORT,() => {
            console.log(`server is running port:${PORT}`);

        });
    } catch (error) {
        console.log(`database connection failed:${error}`);
        process.exit(1);
    }

}
startServer();


