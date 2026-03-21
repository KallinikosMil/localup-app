import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enAuth from '@features/auth/i18n/locales/en.js';
import elAuth from '@features/auth/i18n/locales/el.js';
import enOnboarding from '@features/onboarding/i18n/locales/en.js';
import elOnboarding from '@features/onboarding/i18n/locales/el.js';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          ...enAuth,
          ...enOnboarding,
        },
      },
      el: {
        translation: {
          ...elAuth,
          ...elOnboarding,
        },
      },
    },
    lng: 'en',            
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
