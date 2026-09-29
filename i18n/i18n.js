// import i18next from "i18next";
const  i18next = require('i18next');
// import Backend from "i18next-fs-backend";
const Backend = require('i18next-fs-backend');
// import middleware from "i18next-http-middleware";
const middleware = require('i18next-http-middleware');
const path = require('path');

//language comes from the Accept-Language header (or ?lng=bn), falls back to English
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en","bn"],
    preload: ["en","bn"],
    initAsync: false,
    backend: {
      loadPath: path.join(__dirname,"../locales/{{lng}}/translation.json")
    }
  });
const  i18nMiddleware = middleware;
module.exports = {
   i18next,
   i18nMiddleware
}
