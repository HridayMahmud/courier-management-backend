
const express = require('express');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { createParcel, getMyParcel, getAllParcels, updateParcels, deleteParcels } = require('../contollers/parcelController');

const router = express.Router();

router.post("/create-parcel",auth, role(["admin","courier","customer"]), createParcel);
router.get("/user-parcel",auth,getMyParcel);
router.get("/getall-parcels",auth,role(["admin"]),getAllParcels);
router.put("/update-parcel/:id",auth,updateParcels);
router.delete("/delete-parcel/:id",auth,deleteParcels);

module.exports = router;