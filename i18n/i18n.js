// import i18next from "i18next";
const  i18next = require('i18next');
// import Backend from "i18next-fs-backend";
const Backend = require('i18next-fs-backend');
// import middleware from "i18next-http-middleware";
const middleware = require('i18next-http-middleware');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: "en",
    backend: {
      loadPath: "./locales/{{lng}}/translation.json"
    }
  });
const  i18nMiddleware = middleware;
module.exports = {
   i18next,
   i18nMiddleware
}


