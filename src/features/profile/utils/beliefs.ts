// Politics and religion: the vocabularies, and how a choice is toggled.
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
//   3. Not answering costs nothing. The server scores a missing answer at
//      0.5 — the middle of the field — never 0.
//
// The RANKING lives in the database, not here. discover_candidates
// (scripts/db/2026-09-05_beliefs_and_matching.sql §5) measures politics
// as distance along an ordered axis and religion categorically. An
// earlier version of this file carried a TypeScript copy of that maths
// with its own tests; a review pointed out that nothing imported it, so
// it was dead code that could drift from the live plpgsql without a
// single test noticing. The one source of truth is the SQL.
//
// Modelled on Hinge, the only one of the big three with a real field for
// this: a short closed vocabulary, optional, shown only when filled.

// Ordered left → right ON PURPOSE. discover_candidates hardcodes this
// order as v_politics_axis and scores distance along it, so the order
// here must match — it is what the UI uses to lay the chips out in a
// sequence that reads as the axis the server ranks with.
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

// Tapping the chosen one again clears it. Taking an answer back has to be
// as easy as giving it — for special-category data that is not a
// convenience, it is what makes the consent withdrawable.
//
// The caller MUST feed this the freshest value it has. Computed against a
// stale cached value, the second tap re-sets instead of clearing — which
// is why useUpdateProfile applies the patch optimistically.
export const toggleBelief = <T extends string>(
  current: T | null,
  tapped: T,
): T | null => (current === tapped ? null : tapped);
