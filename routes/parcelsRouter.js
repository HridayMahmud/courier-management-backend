
const express = require('express');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { createParcel, getMyParcel, getAllParcels, updateParcels, deleteParcels, getParcelById, trackParcel, updateStatus, assignCourier, cancelParcel, getAssignedParcels, getStats } = require('../contollers/parcelController');

const router = express.Router();

router.post("/create-parcel",auth, role(["admin","courier","customer"]), createParcel);
router.get("/user-parcel",auth,getMyParcel);
router.get("/getall-parcels",auth,role(["admin"]),getAllParcels);
router.put("/update-parcel/:id",auth,updateParcels);
router.delete("/delete-parcel/:id",auth,deleteParcels);

//fixed paths must stay above "/:id"
router.get("/stats",auth,role(["admin"]),getStats);
router.get("/courier/assigned",auth,role(["courier"]),getAssignedParcels);
router.get("/track/:trackingId",trackParcel);

router.get("/:id",auth,getParcelById);
router.patch("/:id/status",auth,role(["admin","courier"]),updateStatus);
router.patch("/:id/assign",auth,role(["admin"]),assignCourier);
router.patch("/:id/cancel",auth,cancelParcel);

module.exports = router;
