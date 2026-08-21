import { toISODate } from './date';

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
