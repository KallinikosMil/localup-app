import {
  chooseMonth,
  chooseYear,
  daysInMonth,
  decadeOf,
  decadeOptions,
  isDayAllowed,
  isMonthAllowed,
  isYearAllowed,
  yearOptions,
  dayOptions,
  isComplete,
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

describe('the decade rail', () => {
  it('runs newest first and ends at the ceiling decade', () => {
    const decades = decadeOptions(MAX);
    expect(decades[0]).toBe(2000);
    expect(decades).toContain(1990);
    expect(decades[decades.length - 1]).toBe(1900);
  });

  it('puts a year in its own decade', () => {
    expect(decadeOf(1994)).toBe(1990);
    expect(decadeOf(2000)).toBe(2000);
  });

  // The grid is always ten cells. The illegal ones are drawn dimmed
  // rather than omitted — that is the whole point of the redesign.
  it('always offers ten years, legal or not', () => {
    expect(yearOptions(2000)).toHaveLength(10);
    expect(yearOptions(2000)[9]).toBe(2009);
  });

  it('marks the years past the ceiling as not allowed', () => {
    expect(isYearAllowed(2008, MAX)).toBe(true);
    expect(isYearAllowed(2009, MAX)).toBe(false);
  });
});

describe('the ceiling inside the newest year', () => {
  it('closes the months after the ceiling month', () => {
    expect(isMonthAllowed(2008, 5, MAX)).toBe(true); // June
    expect(isMonthAllowed(2008, 6, MAX)).toBe(false); // July
    // Any earlier year is untouched.
    expect(isMonthAllowed(2007, 11, MAX)).toBe(true);
  });

  it('closes the days after the ceiling day', () => {
    expect(isDayAllowed(2008, 5, 14, MAX)).toBe(true);
    expect(isDayAllowed(2008, 5, 15, MAX)).toBe(false);
    expect(isDayAllowed(2008, 4, 31, MAX)).toBe(true); // May, untouched
  });

  it('gives a month its real length', () => {
    expect(dayOptions(1995, 1)).toHaveLength(28);
    expect(dayOptions(1996, 1)).toHaveLength(29);
  });
});

// The rule the designer overruled, and the reason it matters.
describe('choosing a year never silently rewrites a month', () => {
  it('clears the month and asks again when the year closes it', () => {
    const before = { year: 1994, month: 8, day: 3 }; // September
    const after = chooseYear(before, 2008, MAX);

    expect(after.parts).toEqual({ year: 2008, month: null, day: null });
    expect(after.step).toBe('month');
    expect(after.cleared).toBe(true);
  });

  it('keeps a month the new year still allows', () => {
    const after = chooseYear({ year: 1994, month: 2, day: 10 }, 1996, MAX);
    expect(after.parts).toEqual({ year: 1996, month: 2, day: 10 });
    expect(after.cleared).toBe(false);
  });

  // 29 February exists in 1996 and not in 1995.
  it('clears only the day when the month survives but the day does not', () => {
    const after = chooseYear({ year: 1996, month: 1, day: 29 }, 1995, MAX);
    expect(after.parts).toEqual({ year: 1995, month: 1, day: null });
    expect(after.cleared).toBe(true);
  });

  it('never invents a value the user did not choose', () => {
    const after = chooseYear({ year: 1994, month: 0, day: 31 }, 1994, MAX);
    // January is 31 days in every year, so nothing moves.
    expect(after.parts.day).toBe(31);
  });
});

describe('choosing a month', () => {
  it('clears a day the new month is too short for', () => {
    const after = chooseMonth({ year: 1995, month: 0, day: 31 }, 1, MAX);
    expect(after.parts).toEqual({ year: 1995, month: 1, day: null });
    expect(after.cleared).toBe(true);
    expect(after.step).toBe('day');
  });

  it('keeps a day that still fits', () => {
    const after = chooseMonth({ year: 1995, month: 0, day: 12 }, 1, MAX);
    expect(after.parts.day).toBe(12);
    expect(after.cleared).toBe(false);
  });
});

describe('isComplete', () => {
  it('needs all three', () => {
    expect(isComplete({ year: 1994, month: 2, day: 14 })).toBe(true);
    expect(isComplete({ year: 1994, month: 2, day: null })).toBe(false);
    expect(isComplete({ year: null, month: null, day: null })).toBe(false);
  });
});
