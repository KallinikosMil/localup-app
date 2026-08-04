export enum Translations {
  // V10: the two halves of every error branch in the app — "the
  // request never left the device" vs "the server said no".
  COMMON_ERROR_OFFLINE = 'commonErrorOffline',
  COMMON_ERROR_GENERIC = 'commonErrorGeneric',

  // The TRAVELER/LOCAL pill. Lives in shared, not in a feature, because
  // ModeBadge is a shared component rendered from Discover and Profile.
  COMMON_MODE_TRAVELER = 'commonModeTraveler',
  COMMON_MODE_LOCAL = 'commonModeLocal',

  // Shown once a load passes ~4.5s. The per-feature copies
  // (profileWaking / matchesWaking / chatWaking) predate this shared key
  // and say the same thing; they can adopt it whenever those files are
  // next touched.
  COMMON_WAKING = 'commonWaking',
}
