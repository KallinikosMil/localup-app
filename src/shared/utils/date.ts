// A birthdate is a CALENDAR date, not an instant in time.
//
// `Date#toISOString()` converts to UTC first, so a date the picker stored at
// LOCAL midnight rolls back a full day for anyone east of UTC — i.e. every
// user in Greece. That shipped: onboarding wrote every birthdate one day
// early, and since there is no date-of-birth field on profile/edit, the wrong
// value could never be corrected from inside the app.
//
// Reading the local calendar fields is the fix: whatever day the user saw in
// the picker is the day we store, in every timezone.
export const toISODate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
