// The rules for choosing interests, with no screen attached.
//
// They were written once inside the onboarding screen and enforced nowhere
// else, so the edit path had to either import a screen or copy them. The
// server enforces the same 3-5 in set_user_interests; this is the copy the
// UI needs to disable a button, not the one that decides.

export const INTEREST_MIN = 3;
export const INTEREST_MAX = 5;

// Adding past the cap is a no-op rather than an error: the chips are a
// toggle grid, and the honest response to "you already have five" is that
// the sixth simply does not light up.
export const toggleInterest = (
  selected: readonly string[],
  id: string,
): string[] => {
  if (selected.includes(id)) {
    return selected.filter(x => x !== id);
  }
  if (selected.length >= INTEREST_MAX) {
    return [...selected];
  }
  return [...selected, id];
};

export const canSaveInterests = (selected: readonly string[]): boolean =>
  selected.length >= INTEREST_MIN && selected.length <= INTEREST_MAX;

// How many more are needed before saving is possible. 0 once the floor is
// reached, so a screen can render "pick 2 more" without doing the sum.
export const interestsStillNeeded = (selected: readonly string[]): number =>
  Math.max(INTEREST_MIN - selected.length, 0);

// Whether the set actually changed, so an unchanged screen can skip the
// write entirely. Order is not meaningful — the server stores rows, not a
// list — so [a,b,c] and [c,b,a] are the same selection.
export const interestsChanged = (
  before: readonly string[],
  after: readonly string[],
): boolean => {
  if (before.length !== after.length) return true;
  const seen = new Set(before);
  return after.some(id => !seen.has(id));
};
