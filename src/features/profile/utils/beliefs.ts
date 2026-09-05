// Politics and religion: the vocabularies, and how close two answers are.
//
// ⚠️ Both are GDPR Article 9 SPECIAL CATEGORY data — "political opinions"
// and "religious or philosophical beliefs" are named there next to health
// and sexual orientation. Processing them is prohibited by default and
// lawful here only under 9(2)(a), EXPLICIT consent. Three rules follow
// from that and none of them are style choices:
//
//   1. Always optional. No screen may require either one.
//   2. Never a filter. They shift an ordering; they never remove anybody
//      from anyone's deck.
//   3. Not answering costs nothing. See UNANSWERED below.
//
// Modelled on Hinge, the only one of the big three with a real field for
// this. Tinder has neither — people write it in their bio, and it ran
// temporary election stickers in 2024. Bumble uses it as a filter. A short
// closed vocabulary, shown only when filled, is the shape that has
// survived contact with users.

export const POLITICS = [
  'left',
  'centre_left',
  'centre',
  'centre_right',
  'right',
  'apolitical',
] as const;

export const RELIGION = [
  'agnostic',
  'atheist',
  'buddhist',
  'christian',
  'hindu',
  'jewish',
  'muslim',
  'spiritual',
  'other',
] as const;

export type Politics = (typeof POLITICS)[number];
export type Religion = (typeof RELIGION)[number];

// The ordered axis, WITHOUT 'apolitical' — that is not a point on it.
// Order is load-bearing: closeness is measured as distance along this
// array, so centre_left and centre come out as neighbours while left and
// right do not. Reordering this changes the algorithm.
//
// Must stay identical to v_politics_axis in discover_candidates. The
// server is the one that ranks; this copy exists so the UI can explain
// itself and so the two can be diffed by eye.
export const POLITICS_AXIS = [
  'left',
  'centre_left',
  'centre',
  'centre_right',
  'right',
] as const;

// What a pair scores when either side has not answered.
//
// NOT zero. Zero is the score for the furthest possible disagreement, so
// using it would rank everyone who declines below everyone who agrees and
// level with everyone who disagrees — a standing penalty for withholding
// Article 9 data, which is pressure to disclose it. 0.5 places a
// non-answer in the middle of the field, which is what neutral means.
export const UNANSWERED = 0.5;

// A position off the axis is not opposed to any position on it — it is not
// answering the same question. Mildly positive so it never reads as
// agreement and never as conflict.
const OFF_AXIS = 0.35;

// Different faiths are a difference, not an opposition, and this app is
// for meeting someone in a city rather than for marrying them.
const DIFFERENT_RELIGION = 0.2;

export const politicsAffinity = (
  a: Politics | null | undefined,
  b: Politics | null | undefined,
): number => {
  if (!a || !b) return UNANSWERED;
  if (a === b) return 1;

  const ia = POLITICS_AXIS.indexOf(a as (typeof POLITICS_AXIS)[number]);
  const ib = POLITICS_AXIS.indexOf(b as (typeof POLITICS_AXIS)[number]);
  if (ia === -1 || ib === -1) return OFF_AXIS;

  return 1 - Math.abs(ia - ib) / (POLITICS_AXIS.length - 1);
};

export const religionAffinity = (
  a: Religion | null | undefined,
  b: Religion | null | undefined,
): number => {
  if (!a || !b) return UNANSWERED;
  return a === b ? 1 : DIFFERENT_RELIGION;
};

// Tapping the chosen one again clears it. Taking an answer back has to be
// as easy as giving it — for special-category data that is not a
// convenience, it is what makes the consent withdrawable.
export const toggleBelief = <T extends string>(
  current: T | null,
  tapped: T,
): T | null => (current === tapped ? null : tapped);
