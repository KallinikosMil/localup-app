import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en_auth from '../../auth/i18n/locales.ts/en.js';
import el_auth from '../../auth/i18n/locales.ts/el.js';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en_auth } },
      el: { translation: { ...el_auth } },
    },
    lng: 'en',            
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
