import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enAuth from '@features/auth/i18n/locales.ts/en.js';
import elAuth from '@features/auth/i18n/locales.ts/el.js';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...enAuth } },
      el: { translation: { ...elAuth } },
    },
    lng: 'en',            
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
