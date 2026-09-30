const express = require('express');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { listUsers, createCourier, resetUserPassword } = require('../contollers/userController');

const router = express.Router();

//admin only
router.get("/",auth,role(["admin"]),listUsers);
router.post("/courier",auth,role(["admin"]),createCourier);
router.patch("/password",auth,role(["admin"]),resetUserPassword);

module.exports = router;
