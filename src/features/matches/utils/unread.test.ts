import { isUnread, activityAt, readAt } from './unread';

const T0 = '2026-09-08T10:00:00.000Z';
const T1 = '2026-09-08T11:00:00.000Z';
const T2 = '2026-09-08T12:00:00.000Z';

const match = (over: Partial<Parameters<typeof isUnread>[0]> = {}) => ({
  created_at: T0,
  last_message_at: null,
  last_read_at: null,
  unread_count: 0,
  ...over,
});

describe('isUnread', () => {
  // The bug this file exists for. Reported from a device: send a message,
  // go back to the list, and your own message is highlighted with a badge.
  it('is false when the newest message is my own', () => {
    expect(
      isUnread(
        match({
          // I opened the thread at T1, then sent something at T2.
          last_read_at: T1,
          last_message_at: T2,
          // Server counts only messages from the other person, so mine
          // leaves this at zero — which is what makes it the right signal.
          unread_count: 0,
        }),
      ),
    ).toBe(false);
  });

  it('is true when the other person has sent something unseen', () => {
    expect(
      isUnread(
        match({ last_read_at: T1, last_message_at: T2, unread_count: 1 }),
      ),
    ).toBe(true);
  });

  it('is false once their messages have been read', () => {
    expect(
      isUnread(
        match({ last_read_at: T2, last_message_at: T1, unread_count: 0 }),
      ),
    ).toBe(false);
  });

  // A match with no messages at all still needs to announce itself, and
  // the only timestamp it has is when it was made.
  it('is true for a new match that has never been opened', () => {
    expect(isUnread(match({ last_read_at: null, last_message_at: null }))).toBe(
      true,
    );
  });

  it('is false for a new match that has been opened', () => {
    expect(isUnread(match({ last_read_at: T1, last_message_at: null }))).toBe(
      false,
    );
  });

  // The count arrives from the server and a row can be missing it.
  it('treats a null count as nothing unread', () => {
    expect(
      isUnread(
        match({ last_read_at: T1, last_message_at: T2, unread_count: null }),
      ),
    ).toBe(false);
  });
});

describe('activityAt / readAt', () => {
  it('falls back to created_at when nobody has written yet', () => {
    expect(activityAt(match())).toBe(new Date(T0).getTime());
  });

  it('prefers the newest message over the match date', () => {
    expect(activityAt(match({ last_message_at: T2 }))).toBe(
      new Date(T2).getTime(),
    );
  });

  it('reads a missing watermark as older than everything', () => {
    expect(readAt(match())).toBe(0);
  });
});
