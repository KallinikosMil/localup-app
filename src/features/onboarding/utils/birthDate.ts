// The lists behind the date-of-birth picker.
//
// The native spinner was a circular wheel that opened on the current
// month and wrapped around, so the months read "September ... August" and
// there was no first or last. Three plain lists say what they are.
//
// The only real work here is the ceiling. Signing up requires being 18,
// so the newest allowed date is a specific day — not a year. Someone who
// picks that year must not then be offered a later month, and inside that
// month must not be offered a later day, or the picker hands back a date
// the form will refuse.

export const MONTHS_IN_YEAR = 12;

// How far back the year column goes. A hundred years covers every
// plausible user and keeps the list finite.
export const YEAR_SPAN = 100;

export type BirthParts = { year: number; month: number; day: number };

export const daysInMonth = (year: number, month: number) =>
  // Day 0 of the NEXT month is the last day of this one, and it handles
  // leap years without a rule of its own.
  new Date(year, month + 1, 0).getDate();

// Newest first. A 19-year-old should not scroll past eighty rows to reach
// their own year.
export const yearOptions = (maxDate: Date): number[] => {
  const newest = maxDate.getFullYear();
  const out: number[] = [];
  for (let y = newest; y > newest - YEAR_SPAN; y--) out.push(y);
  return out;
};

// Months are 0-11 here, as everywhere in JS. Only the newest year is ever
// cut short.
export const monthOptions = (year: number, maxDate: Date): number[] => {
  const last =
    year === maxDate.getFullYear() ? maxDate.getMonth() : MONTHS_IN_YEAR - 1;
  const out: number[] = [];
  for (let m = 0; m <= last; m++) out.push(m);
  return out;
};

export const dayOptions = (
  year: number,
  month: number,
  maxDate: Date,
): number[] => {
  const last =
    year === maxDate.getFullYear() && month === maxDate.getMonth()
      ? maxDate.getDate()
      : daysInMonth(year, month);
  const out: number[] = [];
  for (let d = 1; d <= last; d++) out.push(d);
  return out;
};

// Moving one column can invalidate another: 31 January then February, or
// a year that pulls the whole date past the ceiling. Rather than block
// the move, pull the others back to the nearest legal value — the user
// asked for that year, so the year is what we keep.
export const clampParts = (parts: BirthParts, maxDate: Date): BirthParts => {
  const year = parts.year;
  const months = monthOptions(year, maxDate);
  const month = Math.min(parts.month, months[months.length - 1]);
  const days = dayOptions(year, month, maxDate);
  const day = Math.min(parts.day, days[days.length - 1]);
  return { year, month, day };
};

export const toDate = (parts: BirthParts) =>
  new Date(parts.year, parts.month, parts.day);

export const fromDate = (d: Date): BirthParts => ({
  year: d.getFullYear(),
  month: d.getMonth(),
  day: d.getDate(),
});
