const { rateLimit } = require('express-rate-limit');

//Limits are per client IP. RATE_LIMIT=off disables them (automated tests run many logins from one IP).
const disabled = ()=>String(process.env.RATE_LIMIT || "").toLowerCase() === "off";

const limiter = (limit, minutes, message)=>rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: disabled,
    message: {message}
});

//failed and successful attempts both count; a real user rarely needs 10 logins in 15 minutes
const loginLimiter = limiter(10, 15, "Too many login attempts. Please try again in 15 minutes.");
const registerLimiter = limiter(10, 60, "Too many accounts created from this network. Please try again later.");
//reset codes go out by email, keep this tight
const passwordResetLimiter = limiter(5, 15, "Too many password reset requests. Please try again in 15 minutes.");

module.exports = {loginLimiter, registerLimiter, passwordResetLimiter};
