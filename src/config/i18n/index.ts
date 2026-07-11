import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enAuth from '@features/auth/i18n/locales/en.js';
import elAuth from '@features/auth/i18n/locales/el.js';
import enOnboarding from '@features/onboarding/i18n/locales/en.js';
import elOnboarding from '@features/onboarding/i18n/locales/el.js';
import enDiscover from '@features/discover/i18n/locales/en.js';
import elDiscover from '@features/discover/i18n/locales/el.js';
import enMatches from '@features/matches/i18n/locales/en.js';
import elMatches from '@features/matches/i18n/locales/el.js';
import enChat from '@features/chat/i18n/locales/en.js';
import elChat from '@features/chat/i18n/locales/el.js';
import enProfile from '@features/profile/i18n/locales/en.js';
import elProfile from '@features/profile/i18n/locales/el.js';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        ...enAuth,
        ...enOnboarding,
        ...enDiscover,
        ...enMatches,
        ...enChat,
        ...enProfile,
      },
    },
    el: {
      translation: {
        ...elAuth,
        ...elOnboarding,
        ...elDiscover,
        ...elMatches,
        ...elChat,
        ...elProfile,
      },
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
