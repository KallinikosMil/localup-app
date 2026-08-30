// The deck filters as plain values: the numbers, the limits, and the one
// policy the app applies to them.
//
// They live here rather than beside the queries so they can be tested
// without dragging react-query and the store into a test runner that only
// knows pure logic.

// These must match the server. discover_candidates falls back to exactly
// these when a user has no row, so a screen showing anything else would be
// describing a deck the server is not building.
//
// 10 km, not the 75 this shipped with. 75 was never a "nearby" promise —
// from central Athens it reaches Corinth — and the app sells meeting a
// local where you actually are. Straight-line km is also a poor stand-in
// for what decides whether two people meet, which is travel time: 30 km
// across a large city at rush hour is an hour or more.
export const PREF_DEFAULTS = {
  maxDistanceKm: 10,
  minAge: 18,
  maxAge: 99,
} as const;

// Enforced by CHECK constraints, so these are the UI's copy of a rule the
// database owns — not the rule itself. The designer's slider stops at 150;
// the column allows up to 500, deliberately wider so the range can be opened
// later without a migration.
export const PREF_LIMITS = {
  distanceMin: 5,
  distanceMax: 500,
  ageMin: 18,
  ageMax: 99,
} as const;

// The furthest we will ever RECOMMEND — which is not the furthest anyone
// may choose. The slider goes to PREF_LIMITS.distanceMax and that stays
// the user's call; this is the line past which a one-tap "widen to X"
// stops being advice and becomes a number nobody would actually cross.
//
// Without it the button prints whatever the maths returns, and the maths
// has no ceiling: if the tenth-nearest person is in Larissa it will
// cheerfully offer "Widen to 215 km". Past this line the screen states
// the fact and hands over the filters instead of pointing at a distance
// it would not defend.
export const SUGGEST_CAP_KM = 30;

export type MatchPreferences = {
  maxDistanceKm: number;
  minAge: number;
  maxAge: number;
};

export type DistanceSummary = {
  total: number;
  p25Km: number;
  p75Km: number;
  suggestedKm: number;
  suggestedCount: number;
};
