import { toISODate, ageFromISODate, formatDate } from './date';

describe('toISODate', () => {
  it('returns the calendar date the user picked', () => {
    expect(toISODate(new Date(1998, 5, 14))).toBe('1998-06-14');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toISODate(new Date(2001, 0, 3))).toBe('2001-01-03');
  });

  // The regression this function exists for. A picker hands back local
  // midnight; toISOString converts to UTC first, so east of UTC the date
  // rolls back a day. Asserting the two DISAGREE is the point — if someone
  // "simplifies" this back to toISOString, this test is what stops them.
  it('does not shift the day east of UTC, where toISOString would', () => {
    const localMidnight = new Date(1998, 5, 14, 0, 0, 0);
    expect(toISODate(localMidnight)).toBe('1998-06-14');

    // Only meaningful when the test machine actually is east of UTC;
    // getTimezoneOffset is negative there.
    if (localMidnight.getTimezoneOffset() < 0) {
      expect(localMidnight.toISOString().slice(0, 10)).toBe('1998-06-13');
      expect(toISODate(localMidnight)).not.toBe(
        localMidnight.toISOString().slice(0, 10),
      );
    }
  });

  it('keeps the picked day for a late-evening local time', () => {
    // 23:30 local on the 31st: west of UTC this is the 1st in UTC, so the
    // naive conversion moves the birthday into the next month.
    expect(toISODate(new Date(1990, 11, 31, 23, 30))).toBe('1990-12-31');
  });

  it('handles a leap day', () => {
    expect(toISODate(new Date(2000, 1, 29))).toBe('2000-02-29');
  });
});

describe('ageFromISODate', () => {
  // A fixed "today" so these never depend on when they are run.
  const today = new Date(2026, 7, 26); // 2026-08-26

  it('counts whole years for a birthday already passed this year', () => {
    expect(ageFromISODate('1997-03-14', today)).toBe(29);
  });

  it('does NOT count the year when the birthday is still ahead', () => {
    expect(ageFromISODate('1997-12-01', today)).toBe(28);
  });

  // The bug a millisecond-difference implementation gets wrong: on the
  // birthday itself the person has just turned that age.
  it('counts the birthday itself', () => {
    expect(ageFromISODate('1997-08-26', today)).toBe(29);
  });

  it('does not count the day before the birthday', () => {
    expect(ageFromISODate('1997-08-27', today)).toBe(28);
  });

  it('handles a leap-day birthday in a non-leap year', () => {
    expect(ageFromISODate('2000-02-29', today)).toBe(26);
  });

  it('returns null rather than NaN for missing or malformed input', () => {
    expect(ageFromISODate(null, today)).toBeNull();
    expect(ageFromISODate(undefined, today)).toBeNull();
    expect(ageFromISODate('', today)).toBeNull();
    expect(ageFromISODate('not-a-date', today)).toBeNull();
    expect(ageFromISODate('1997-13-01', today)).toBeNull();
  });

  it('returns null for a date in the future', () => {
    expect(ageFromISODate('2030-01-01', today)).toBeNull();
  });
});

describe('formatDate', () => {
  const d = new Date(2026, 2, 12); // 12 March 2026, local

  it('formats in the language it is given, not the device one', () => {
    expect(formatDate(d, 'el', { month: 'long' })).toBe('Μαρτίου');
    expect(formatDate(d, 'en', { month: 'long' })).toBe('March');
  });

  // The whole point of the helper: a list must not die because one date
  // was handed a language tag Intl does not accept.
  it('falls back instead of throwing on a malformed tag', () => {
    expect(() => formatDate(d, 'not a tag', { month: 'long' })).not.toThrow();
    expect(formatDate(d, 'not a tag', { month: 'long' })).not.toBe('');
  });
});
