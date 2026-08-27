import React from 'react';

import FullScreenLoader from '@shared/components/FullScreenLoader';

// The landing pad for the OAuth redirect. It renders a loader and nothing
// else — but without it, signing in with Google ends on "Unmatched Route".
//
// useGoogleSignIn sends Supabase to Linking.createURL('/auth/callback').
// When Google answers, Android hands that URL to the app and TWO things
// see it: openAuthSessionAsync, which resolves with the tokens and signs
// the user in correctly, and expo-router's linking layer, which tries to
// navigate to /auth/callback. With no file here that second consumer
// found no route and drew its 404 over a session that had actually
// succeeded — sign-in worked, and it looked broken.
//
// Nothing needs to happen on this screen. /auth/callback is inside the
// auth group, so AppGuard sees an authenticated user standing in it and
// replaces it with Discover (or onboarding, for a first-time Google
// account) on the very next commit. The loader is the same component
// login.tsx and AppGuard render, so the handoff is one continuous
// spinner rather than a flash of a different screen.
//
// It also must NOT read the tokens itself: openAuthSessionAsync already
// consumed them, and useAuthDeepLink is a second reader of the same URL.
// A third would be one more race for no gain.
export default function AuthCallbackScreen() {
  return <FullScreenLoader />;
}
