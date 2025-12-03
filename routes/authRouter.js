const express = require('express');
const { registration, login, forgotPassword, resetPassword } = require('../contollers/authController');

const router = express.Router();

router.post("/register",registration);
router.post("/login",login);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password",resetPassword);

module.exports = router;