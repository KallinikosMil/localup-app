import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import el from './locales/el';

const resources = {
  en: { translation: { ...en } },
  el: { translation: { ...el } },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources,
  lng: 'en', // or detect based on device later
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
