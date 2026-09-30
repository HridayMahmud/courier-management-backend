const express = require('express');
const { registration, login, forgotPassword, resetPassword, me, updateMe, changePassword } = require('../contollers/authController');
const auth = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post("/register",registerLimiter,registration);
router.post("/login",loginLimiter,login);
router.post("/forgot-password",passwordResetLimiter,forgotPassword);
router.post("/reset-password",passwordResetLimiter,resetPassword);
router.get("/me",auth,me);
router.patch("/me",auth,updateMe);
router.patch("/password",auth,loginLimiter,changePassword);

module.exports = router;
