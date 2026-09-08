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

// Which DAY a message belongs to, for the separator inside a conversation.
//
// Deliberately not derived from relativeTime(). That function answers "how
// long ago", and the two questions disagree at exactly one point: midnight.
// A message sent at 23:50 and read at 00:10 is twenty minutes old — which
// is the right answer on a Matches row — but it belongs under YESTERDAY's
// separator. The chat screen used to map the elapsed-time kinds 'now',
// 'minutes' and 'hours' onto "Today", and the first two carry no calendar
// information at all, so every late-night conversation read as today's
// until the messages aged past an hour.
export type CalendarDay =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'weekday'; date: Date }
  | { kind: 'date'; date: Date }
  | { kind: 'none' };

export const calendarDay = (
  iso: string | null | undefined,
  now: Date = new Date(),
): CalendarDay => {
  if (!iso) return { kind: 'none' };

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return { kind: 'none' };

  const gap = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  // Clock skew can date a message slightly in the reader's future; it
  // still belongs to the day the reader is having.
  if (gap <= 0) return { kind: 'today' };
  if (gap === 1) return { kind: 'yesterday' };
  if (gap < 7) return { kind: 'weekday', date: then };
  return { kind: 'date', date: then };
};

// Whether two timestamps fall on the same calendar day for the reader.
// Used to decide where a day separator goes in a conversation — and, like
// everything above, it compares dates rather than subtracting instants,
// so 23:59 and 00:01 are correctly two different days.
export const sameCalendarDay = (
  a: string | null | undefined,
  b: string | null | undefined,
): boolean => {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return startOfDay(da) === startOfDay(db);
};
