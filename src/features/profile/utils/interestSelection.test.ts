import {
  INTEREST_MAX,
  INTEREST_MIN,
  canSaveInterests,
  interestsChanged,
  interestsStillNeeded,
  toggleInterest,
} from './interestSelection';

// Derived from the constants rather than written out. These were literal
// five-element arrays, so raising the cap to 8 broke tests that were
// describing the cap correctly — the numbers had simply been copied out of
// it. Building them here means the suite follows the rule wherever it goes.
const ids = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `i${i}`);
const atCap = ids(INTEREST_MAX);
const overCap = ids(INTEREST_MAX + 1);

describe('toggleInterest', () => {
  it('adds one that is not selected', () => {
    expect(toggleInterest(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes one that is', () => {
    expect(toggleInterest(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  // The grid is a toggle, so the honest response to one tap past the cap is
  // that the chip does not light up — not an error the user has to dismiss.
  it('ignores an addition past the cap', () => {
    expect(atCap).toHaveLength(INTEREST_MAX);
    expect(toggleInterest(atCap, 'extra')).toEqual(atCap);
  });

  it('still allows removal when full', () => {
    const [first, ...rest] = atCap;
    expect(toggleInterest(atCap, first)).toEqual(rest);
  });

  it('does not mutate the input', () => {
    const before = ['a', 'b'];
    toggleInterest(before, 'c');
    expect(before).toEqual(['a', 'b']);
  });
});

describe('canSaveInterests', () => {
  it('refuses below the floor', () => {
    expect(canSaveInterests(['a', 'b'])).toBe(false);
  });

  it('accepts the floor and the cap', () => {
    expect(canSaveInterests(['a', 'b', 'c'])).toBe(true);
    expect(canSaveInterests(atCap)).toBe(true);
  });

  it('refuses above the cap, which toggle cannot produce but a caller can', () => {
    expect(canSaveInterests(overCap)).toBe(false);
  });
});

describe('interestsStillNeeded', () => {
  it('counts down to the floor and stops at zero', () => {
    expect(interestsStillNeeded([])).toBe(INTEREST_MIN);
    expect(interestsStillNeeded(['a'])).toBe(2);
    expect(interestsStillNeeded(['a', 'b', 'c'])).toBe(0);
    expect(interestsStillNeeded(['a', 'b', 'c', 'd'])).toBe(0);
  });
});

describe('interestsChanged', () => {
  // The server stores rows, not a list, so a reorder is not a change and
  // must not cost a write.
  it('treats a reorder as unchanged', () => {
    expect(interestsChanged(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(false);
  });

  it('notices a swap of the same size', () => {
    expect(interestsChanged(['a', 'b', 'c'], ['a', 'b', 'd'])).toBe(true);
  });

  it('notices a different size', () => {
    expect(interestsChanged(['a', 'b', 'c'], ['a', 'b', 'c', 'd'])).toBe(true);
  });
});
