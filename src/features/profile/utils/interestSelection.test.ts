import {
  INTEREST_MAX,
  INTEREST_MIN,
  canSaveInterests,
  interestsChanged,
  interestsStillNeeded,
  toggleInterest,
} from './interestSelection';

describe('toggleInterest', () => {
  it('adds one that is not selected', () => {
    expect(toggleInterest(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes one that is', () => {
    expect(toggleInterest(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  // The grid is a toggle, so the honest response to a sixth tap is that the
  // chip does not light up — not an error the user has to dismiss.
  it('ignores an addition past the cap', () => {
    const full = ['a', 'b', 'c', 'd', 'e'];
    expect(full).toHaveLength(INTEREST_MAX);
    expect(toggleInterest(full, 'f')).toEqual(full);
  });

  it('still allows removal when full', () => {
    expect(toggleInterest(['a', 'b', 'c', 'd', 'e'], 'c')).toEqual([
      'a',
      'b',
      'd',
      'e',
    ]);
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
    expect(canSaveInterests(['a', 'b', 'c', 'd', 'e'])).toBe(true);
  });

  it('refuses above the cap, which toggle cannot produce but a caller can', () => {
    expect(canSaveInterests(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(false);
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
