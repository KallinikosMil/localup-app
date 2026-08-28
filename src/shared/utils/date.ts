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

// Age in whole years, for the "Dimitris, 29" headline.
//
// The same calendar-vs-instant care as above: the stored value is a
// YYYY-MM-DD string, so it is compared field by field rather than by
// subtracting timestamps. Dividing a millisecond difference by 365.25
// days is off by one for anyone whose birthday is near today, which is
// roughly 1 in 180 users on any given day.
//
// `null` for a missing or unparseable date — the caller renders the name
// alone rather than "Dimitris, NaN".
export const ageFromISODate = (
  iso: string | null | undefined,
  today: Date = new Date(),
): number | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = today.getFullYear() - year;
  const monthNow = today.getMonth() + 1;
  const dayNow = today.getDate();
  // Birthday has not happened yet this year.
  if (monthNow < month || (monthNow === month && dayNow < day)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

// Format a date in the language the APP is serving, not the one the
// handset is set to.
//
// `toLocaleDateString(undefined, …)` resolves to the device locale, which
// is independent of i18n.language. Every call site that did that sat
// inside a switch whose other branches went through t() — so a Greek
// handset running the app in English produced 'Yesterday' on one row and
// 'Τρί' on the next, in the same column.
//
// Passing an unsupported or malformed tag makes Intl throw a RangeError,
// which would take down a whole list to format one date. Fall back to the
// device locale in that case: a date in the wrong language is a blemish,
// a crash is not.
export const formatDate = (
  date: Date,
  language: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  try {
    return date.toLocaleDateString(language, options);
  } catch {
    return date.toLocaleDateString(undefined, options);
  }
};
