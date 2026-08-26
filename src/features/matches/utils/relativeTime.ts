// "2m", "1h", "Yesterday", "Tue" — the timestamp on a match row.
//
// This returns the SHAPE of the answer, not the words. The screen maps it
// to i18n keys, so Greek is not stuck with English abbreviations and the
// rules stay testable without mounting a translator.
//
// The weekday case is deliberately not covered here either: the caller
// formats it with `toLocaleDateString`, which already knows every
// language's short day names better than a lookup table would.

export type RelativeTime =
  | { kind: 'now' }
  | { kind: 'minutes'; value: number }
  | { kind: 'hours'; value: number }
  | { kind: 'yesterday' }
  // Within the last week: render the weekday name.
  | { kind: 'weekday'; date: Date }
  // Older: render a date.
  | { kind: 'date'; date: Date }
  // No timestamp at all — a match nobody has written in yet.
  | { kind: 'none' };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Calendar days apart, NOT elapsed hours. 23:50 and 00:10 are 20 minutes
// apart and still "yesterday"; 09:00 Monday and 09:00 Tuesday are 24
// hours apart and also "yesterday". Only comparing dates gets both right.
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const relativeTime = (
  iso: string | null | undefined,
  now: Date = new Date(),
): RelativeTime => {
  if (!iso) return { kind: 'none' };

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return { kind: 'none' };

  const diff = now.getTime() - then.getTime();
  // A clock skew between server and handset can put "sent at" slightly in
  // the future. Showing "in 3 minutes" on a message you are reading now
  // is worse than showing "now".
  if (diff < MINUTE) return { kind: 'now' };
  if (diff < HOUR) {
    return { kind: 'minutes', value: Math.floor(diff / MINUTE) };
  }

  const dayGap = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (dayGap === 0) return { kind: 'hours', value: Math.floor(diff / HOUR) };
  if (dayGap === 1) return { kind: 'yesterday' };
  if (dayGap < 7) return { kind: 'weekday', date: then };
  return { kind: 'date', date: then };
};
