// The lists behind the date-of-birth sheet.
//
// Three steps, each computed from the ones above it: decade+year, then
// month, then day. That shape is what makes 1994 two taps instead of a
// hundred swipes, and it also removes most of the 18+ problem before it
// starts — February 1994 simply HAS 28 cells and 2008 simply HAS eight
// months, with nothing to reject afterwards.
//
// The ceiling is a specific DAY, not a year: signing up requires being
// 18, so the newest legal date is today minus eighteen years. Only the
// newest year, and inside it only the newest month, are ever cut short.

export const MONTHS_IN_YEAR = 12;
export const YEARS_PER_DECADE = 10;

// How far back the decade rail goes. A hundred years covers every
// plausible user and keeps the rail finite.
export const YEAR_SPAN = 100;

export type BirthParts = {
  year: number | null;
  month: number | null;
  day: number | null;
};

export const EMPTY_PARTS: BirthParts = { year: null, month: null, day: null };

export type Step = 'year' | 'month' | 'day';

export const daysInMonth = (year: number, month: number) =>
  // Day 0 of the NEXT month is the last day of this one, and it handles
  // leap years without a rule of its own.
  new Date(year, month + 1, 0).getDate();

// The decade a year belongs to: 1994 -> 1990.
export const decadeOf = (year: number) =>
  Math.floor(year / YEARS_PER_DECADE) * YEARS_PER_DECADE;

// Newest first, so the decade someone is most likely to want is the one
// they land on. The rail simply ENDS at the ceiling's decade — a rail
// that ends reads as a rail that ends and needs no explaining.
export const decadeOptions = (maxDate: Date): number[] => {
  const newest = decadeOf(maxDate.getFullYear());
  const oldest = decadeOf(maxDate.getFullYear() - YEAR_SPAN);
  const out: number[] = [];
  for (let d = newest; d >= oldest; d -= YEARS_PER_DECADE) out.push(d);
  return out;
};

// Ten cells, always. The ones past the ceiling are RETURNED, not omitted
// — the sheet draws them dimmed with a reason, because a grid that just
// stops is indistinguishable from a bug.
export const yearOptions = (decade: number) => {
  const out: number[] = [];
  for (let i = 0; i < YEARS_PER_DECADE; i++) out.push(decade + i);
  return out;
};

export const isYearAllowed = (year: number, maxDate: Date) =>
  year <= maxDate.getFullYear();

// Months 0-11. Only the ceiling year is ever short.
export const monthOptions = (year: number, maxDate: Date): number[] => {
  const out: number[] = [];
  for (let m = 0; m < MONTHS_IN_YEAR; m++) out.push(m);
  return out;
};

export const isMonthAllowed = (year: number, month: number, maxDate: Date) =>
  year < maxDate.getFullYear() || month <= maxDate.getMonth();

export const dayOptions = (year: number, month: number): number[] => {
  const out: number[] = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) out.push(d);
  return out;
};

export const isDayAllowed = (
  year: number,
  month: number,
  day: number,
  maxDate: Date,
) =>
  year < maxDate.getFullYear() ||
  month < maxDate.getMonth() ||
  day <= maxDate.getDate();

// Choosing a year can invalidate a month that was already picked.
//
// The old rule pulled the month back to the nearest legal value. That is
// wrong here and the designer was right to overrule it: silently turning
// September into August hands someone a birth date they never chose, on
// the one field that decides whether they are old enough to be here.
// Clearing is loud, costs one tap, and cannot produce a wrong answer
// nobody noticed.
export const chooseYear = (
  parts: BirthParts,
  year: number,
  maxDate: Date,
): { parts: BirthParts; step: Step; cleared: boolean } => {
  const monthStillLegal =
    parts.month !== null && isMonthAllowed(year, parts.month, maxDate);

  if (!monthStillLegal) {
    return {
      parts: { year, month: null, day: null },
      step: 'month',
      cleared: parts.month !== null,
    };
  }

  const dayStillLegal =
    parts.day !== null &&
    parts.day <= daysInMonth(year, parts.month!) &&
    isDayAllowed(year, parts.month!, parts.day, maxDate);

  return {
    parts: { year, month: parts.month, day: dayStillLegal ? parts.day : null },
    step: dayStillLegal ? 'day' : 'day',
    cleared: parts.day !== null && !dayStillLegal,
  };
};

export const chooseMonth = (
  parts: BirthParts,
  month: number,
  maxDate: Date,
): { parts: BirthParts; step: Step; cleared: boolean } => {
  const year = parts.year!;
  const dayStillLegal =
    parts.day !== null &&
    parts.day <= daysInMonth(year, month) &&
    isDayAllowed(year, month, parts.day, maxDate);

  return {
    parts: { year, month, day: dayStillLegal ? parts.day : null },
    step: 'day',
    cleared: parts.day !== null && !dayStillLegal,
  };
};

export const isComplete = (
  parts: BirthParts,
): parts is { year: number; month: number; day: number } =>
  parts.year !== null && parts.month !== null && parts.day !== null;

export const toDate = (parts: BirthParts) =>
  new Date(parts.year!, parts.month!, parts.day!);

export const fromDate = (d: Date | null): BirthParts =>
  d
    ? { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
    : { ...EMPTY_PARTS };
