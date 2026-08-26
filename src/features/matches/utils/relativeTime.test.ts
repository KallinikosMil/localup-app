import { relativeTime } from './relativeTime';

// Local time throughout: the rule is about the reader's calendar, and
// `new Date(y, m, d, h, min)` builds a local instant, which is exactly
// what a phone shows.
const iso = (y: number, m: number, d: number, h = 0, min = 0): string =>
  new Date(y, m, d, h, min).toISOString();

describe('relativeTime', () => {
  // Wednesday 2026-08-26, 15:00 local.
  const now = new Date(2026, 7, 26, 15, 0, 0);

  it('says now for anything under a minute', () => {
    expect(relativeTime(iso(2026, 7, 26, 15, 0), now)).toEqual({
      kind: 'now',
    });
  });

  // The boundary, pinned: 60s exactly is already "1m", not "now".
  it('flips to minutes at exactly one minute', () => {
    expect(relativeTime(iso(2026, 7, 26, 14, 59), now)).toEqual({
      kind: 'minutes',
      value: 1,
    });
  });

  it('counts whole minutes under an hour', () => {
    expect(relativeTime(iso(2026, 7, 26, 14, 58), now)).toEqual({
      kind: 'minutes',
      value: 2,
    });
  });

  it('counts whole hours within the same calendar day', () => {
    expect(relativeTime(iso(2026, 7, 26, 12, 0), now)).toEqual({
      kind: 'hours',
      value: 3,
    });
  });

  // Minutes beat the calendar. 23:50 read at 00:10 is twenty minutes ago,
  // and "Yesterday" would be technically true and useless.
  it('still counts minutes when the hour crossed midnight', () => {
    expect(
      relativeTime(iso(2026, 7, 25, 23, 50), new Date(2026, 7, 26, 0, 10)),
    ).toEqual({ kind: 'minutes', value: 20 });
  });

  // The reason days are compared as DATES and not as elapsed hours: this
  // is exactly 24h back, and "24h" is not something anyone writes.
  it('says yesterday a full 24 hours back', () => {
    expect(relativeTime(iso(2026, 7, 25, 15, 0), now)).toEqual({
      kind: 'yesterday',
    });
  });

  // ...and the other direction: 3 hours back can still be yesterday.
  it('says yesterday for late last night read early this morning', () => {
    expect(
      relativeTime(iso(2026, 7, 25, 22, 0), new Date(2026, 7, 26, 1, 0)),
    ).toEqual({ kind: 'yesterday' });
  });

  it('names the weekday inside the last week', () => {
    expect(relativeTime(iso(2026, 7, 23, 9, 0), now).kind).toBe('weekday');
  });

  it('falls back to a date beyond a week', () => {
    expect(relativeTime(iso(2026, 7, 10, 9, 0), now).kind).toBe('date');
  });

  it('treats a future timestamp as now rather than counting backwards', () => {
    // Server/handset clock skew: never render "in 3 minutes".
    expect(relativeTime(iso(2026, 7, 26, 15, 3), now)).toEqual({
      kind: 'now',
    });
  });

  it('returns none for a missing or unparseable timestamp', () => {
    expect(relativeTime(null, now)).toEqual({ kind: 'none' });
    expect(relativeTime(undefined, now)).toEqual({ kind: 'none' });
    expect(relativeTime('not-a-date', now)).toEqual({ kind: 'none' });
  });
});
