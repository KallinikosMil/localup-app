import {
  clampParts,
  dayOptions,
  daysInMonth,
  monthOptions,
  yearOptions,
  YEAR_SPAN,
} from './birthDate';

// Someone turning 18 exactly on 14 June 2008.
const MAX = new Date(2008, 5, 14);

describe('daysInMonth', () => {
  it('knows the short months and the leap years', () => {
    expect(daysInMonth(2008, 0)).toBe(31); // January
    expect(daysInMonth(2008, 3)).toBe(30); // April
    expect(daysInMonth(2008, 1)).toBe(29); // February, leap
    expect(daysInMonth(2007, 1)).toBe(28); // February, not
    expect(daysInMonth(1900, 1)).toBe(28); // the century that is not a leap year
    expect(daysInMonth(2000, 1)).toBe(29); // the one that is
  });
});

describe('yearOptions', () => {
  it('runs newest first and stops after the span', () => {
    const years = yearOptions(MAX);
    expect(years[0]).toBe(2008);
    expect(years).toHaveLength(YEAR_SPAN);
    expect(years[years.length - 1]).toBe(1909);
  });
});

describe('monthOptions', () => {
  it('gives all twelve for any year below the ceiling', () => {
    expect(monthOptions(1995, MAX)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  // The whole reason this function exists.
  it('stops at the ceiling month in the newest year', () => {
    expect(monthOptions(2008, MAX)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('dayOptions', () => {
  it('follows the length of the month', () => {
    expect(dayOptions(1995, 1, MAX)).toHaveLength(28);
    expect(dayOptions(1996, 1, MAX)).toHaveLength(29);
    expect(dayOptions(1995, 3, MAX)).toHaveLength(30);
  });

  it('stops at the ceiling day in the ceiling month', () => {
    const days = dayOptions(2008, 5, MAX);
    expect(days[days.length - 1]).toBe(14);
  });

  it('does not cut a different month of the ceiling year', () => {
    expect(dayOptions(2008, 4, MAX)).toHaveLength(31); // May
  });
});

describe('clampParts', () => {
  it('leaves a legal date alone', () => {
    const parts = { year: 1995, month: 6, day: 20 };
    expect(clampParts(parts, MAX)).toEqual(parts);
  });

  // 31 January, then the user moves the month to February.
  it('pulls the day back when the new month is shorter', () => {
    expect(clampParts({ year: 1995, month: 1, day: 31 }, MAX)).toEqual({
      year: 1995,
      month: 1,
      day: 28,
    });
  });

  it('keeps the 29th when the year is a leap year', () => {
    expect(clampParts({ year: 1996, month: 1, day: 31 }, MAX)).toEqual({
      year: 1996,
      month: 1,
      day: 29,
    });
  });

  // Picking the newest year while a later month is selected must not
  // hand back a date that fails the 18-year rule.
  it('pulls month AND day back under the ceiling', () => {
    expect(clampParts({ year: 2008, month: 11, day: 31 }, MAX)).toEqual({
      year: 2008,
      month: 5,
      day: 14,
    });
  });

  it('keeps the year the user chose rather than the date they had', () => {
    expect(clampParts({ year: 2008, month: 8, day: 3 }, MAX).year).toBe(2008);
  });
});
