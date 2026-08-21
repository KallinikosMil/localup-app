// app.json holds the static config; this file exists for one reason: the
// Android build needs google-services.json, and that file is gitignored
// because the repo is public. EAS Build only uploads what git tracks, so the
// file is provided as an EAS *file* environment variable (GOOGLE_SERVICES_JSON)
// which EAS materialises on the builder and hands us the path to.
//
// Locally the variable is unset, so it falls back to the copy on disk and
// nothing about `npx expo start` changes.
const { expo } = require('./app.json');

module.exports = () => ({
  ...expo,
  android: {
    ...expo.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? expo.android.googleServicesFile,
  },
});
