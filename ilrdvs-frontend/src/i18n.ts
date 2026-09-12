import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import bn from "./locales/bn.json";
import te from "./locales/te.json";
import mr from "./locales/mr.json";
import ta from "./locales/ta.json";
import ur from "./locales/ur.json";
import gu from "./locales/gu.json";
import kn from "./locales/kn.json";
import or from "./locales/or.json";
import ml from "./locales/ml.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  te: { translation: te },
  mr: { translation: mr },
  ta: { translation: ta },
  ur: { translation: ur },
  gu: { translation: gu },
  kn: { translation: kn },
  or: { translation: or },
  ml: { translation: ml },
};

const savedLang = localStorage.getItem("ilrdvs_lang") || "en";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(langCode: string) {
  i18n.changeLanguage(langCode);
  localStorage.setItem("ilrdvs_lang", langCode);
  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  document.documentElement.dir = langConfig && "dir" in langConfig ? langConfig.dir || "ltr" : "ltr";
  document.documentElement.lang = langCode;
}

// Initialize direction
const initialLang = SUPPORTED_LANGUAGES.find((l) => l.code === savedLang);
if (initialLang && "dir" in initialLang && initialLang.dir) {
  document.documentElement.dir = initialLang.dir;
} else {
  document.documentElement.dir = "ltr";
}
document.documentElement.lang = savedLang;

export default i18n;
