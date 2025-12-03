const express = require('express');
const db_connection = require('./config/db.js');
const {i18nMiddleware,i18next} = require('./i18n/i18n.js');

const cors = require('cors');
const app = express();
require('dotenv').config();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(i18nMiddleware.handle(i18next));
const userRoutes = require('./routes/authRouter.js');
const parcelRoutes = require('./routes/parcelsRouter.js');



app.use("/api/auth",userRoutes);
app.use("/api/parcel",parcelRoutes);


const PORT = process.env.PORT || 4000;
app.listen(PORT,async()=>{
await db_connection();
console.log(`server is running at: http://localhost:${PORT}`);
});

