// Hiding something from a screen reader takes two props, one per
// platform, and neither one warns you when it is missing.
//
// This is the pair, spread onto anything: an icon, a decorative row, the
// content behind a modal. Not icon-specific on purpose — the mistake it
// prevents is not about icons, it is about remembering both halves.
//
//   <View {...hiddenFromScreenReader} />
//
// WHY THESE TWO AND NOT THE OTHER TWO
//
// `accessibilityElementsHidden` (iOS) hides the element AND everything
// inside it. Its true Android counterpart is therefore
// `importantForAccessibility="no-hide-descendants"`, NOT `"no"` — `"no"`
// hides only the view itself and leaves its children in the tree. Paired
// with `"no"` the two platforms quietly do different things on any
// element that has children; on a leaf they happen to agree, which is
// exactly how a mismatch like that survives review.
//
// This app already shipped the other flavour of the same mistake: the
// LocalUp mark carried `accessibilityElementsHidden` alone, which is
// iOS-only, so Android ignored it and the mark kept a focus stop that
// announced a private-use character. One prop, one platform, silent
// everywhere else.
// No `aria-hidden` here. It is the web one, and this app has no web
// target — react-native-web is not installed, and the `web` block in
// app.json is Expo template leftovers. Add it the day web is real, not
// before.
export const hiddenFromScreenReader = {
  importantForAccessibility: 'no-hide-descendants',
  accessibilityElementsHidden: true,
} as const;
