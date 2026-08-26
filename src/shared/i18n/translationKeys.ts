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

  // Accessibility labels. They live in shared because the same control
  // appears in several features (a back arrow is a back arrow), and because
  // a screen reader is the only place these strings are ever spoken — they
  // must still be translated, so they are keys like any other copy.
  A11Y_BACK = 'a11yBack',
  A11Y_CLOSE = 'a11yClose',
  A11Y_REFRESH = 'a11yRefresh',
  A11Y_LIKE = 'a11yLike',
  A11Y_PASS = 'a11yPass',
  A11Y_SEND = 'a11ySend',
  A11Y_THEME_TOGGLE = 'a11yThemeToggle',
  A11Y_SHOW_PASSWORD = 'a11yShowPassword',
  A11Y_HIDE_PASSWORD = 'a11yHidePassword',
  A11Y_EDIT_PROFILE = 'a11yEditProfile',
  A11Y_OPEN_PROFILE = 'a11yOpenProfile',
  A11Y_PROFILE_PHOTO = 'a11yProfilePhoto',
  A11Y_PHOTO_OF_TOTAL = 'a11yPhotoOfTotal',
  A11Y_REMOVE_PHOTO_HINT = 'a11yRemovePhotoHint',
  A11Y_ADD_PHOTO = 'a11yAddPhoto',
  A11Y_CHANGE_PHOTO = 'a11yChangePhoto',
  A11Y_ONBOARDING_PROGRESS = 'a11yOnboardingProgress',
  // The visible counter beside the bar. Shorter than the a11y label,
  // which says 'Step 1 of 4' in full because a reader has no bar to
  // look at.
  COMMON_STEP_COUNT = 'commonStepCount',
}
