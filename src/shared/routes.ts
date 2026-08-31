// Every route in the app, named once.
//
// Paths were string literals at 26 call sites, which is 26 chances to
// write '/auth/registr' and find out at runtime — expo-router does not
// fail a bad push, it navigates nowhere and the button looks broken.
// Named here, a typo is a compile error and renaming a screen is one
// edit instead of a search.
//
// The dynamic ones keep expo-router's bracket form, because that is what
// `pathname` expects when you pass `params` alongside it:
//
//   router.push({ pathname: Routes.chat, params: { matchId } })
//
// routes.test.ts asserts that every value below has a matching file in
// src/app. That is the part a constant alone would not buy: it catches a
// route that was renamed or deleted, not just one that was mistyped.

export const Routes = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    callback: '/auth/callback',
  },

  onboarding: {
    nameAge: '/onboarding/name-age',
    homeCity: '/onboarding/home-city',
    photo: '/onboarding/photo',
    interests: '/onboarding/interests',
  },

  // `(tabs)` is a route GROUP — it is part of the file path and of the
  // href, but never appears in the URL a user would see.
  tabs: {
    discover: '/(tabs)/discover',
    matches: '/(tabs)/matches',
    profile: '/(tabs)/profile',
  },

  profile: {
    edit: '/profile/edit',
    interests: '/profile/interests',
    blocked: '/profile/blocked',
    // Dynamic: pass { userId } as params.
    user: '/profile/[userId]',
  },

  // Dynamic: pass { matchId } as params.
  chat: '/chat/[matchId]',

  filters: '/filters',
  settings: '/settings',
} as const;

// Flattened, for the test and for anything that needs to walk them all.
export const allRoutes = (): string[] => {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (node && typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };
  walk(Routes);
  return out;
};
