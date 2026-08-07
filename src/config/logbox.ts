import { LogBox } from 'react-native';

// Imported FIRST in the root layout, before anything that pulls in
// expo-notifications. That ordering is the whole point: the warning below
// is emitted by expo-notifications' own module body (PushTokenAutoRegistration
// calls addPushTokenListener at import time), so a guard inside our code
// runs far too late to stop it — ES module imports execute before any
// module body that depends on them.
//
// The warning is correct and we already act on it: remote push was removed
// from Expo Go in SDK 53 and needs a development build. But it surfaces as
// a full-screen red LogBox on every launch, which hides real errors behind
// a known one. Silencing a message we cannot fix and have already answered
// is worth more than the reminder.
//
// DELETE THIS once the dev-client build replaces Expo Go — at that point
// push works, the warning stops, and this becomes a filter that could hide
// a genuine notifications error.
LogBox.ignoreLogs([
  /expo-notifications: Android Push notifications \(remote notifications\)/,
]);
