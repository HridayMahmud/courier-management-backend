
const messages = {
    en: {
        no_token: "No token provided",
        invalid_token: "Invalid token",
        no_permission: "You do not have permission",
        login_success: "Login successful",
    },
    bn: {
        no_token: "টোকেন পাওয়া যায়নি",
        invalid_token: "ভুল টোকেন",
        no_permission: "আপনার অনুমতি নেই",
        login_success: "লগইন সফল",
    }
};
const localizaion = (req, res, next) => {
    const lang = req.headers["x_lang"] || "en";
    req.t = (key) => messages[lang][key];
    next();
}
module.exports = localizaion;