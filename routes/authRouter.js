const express = require('express');
const { registration, login, forgotPassword, resetPassword, me } = require('../contollers/authController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.post("/register",registration);
router.post("/login",login);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password",resetPassword);
router.get("/me",auth,me);

module.exports = router;