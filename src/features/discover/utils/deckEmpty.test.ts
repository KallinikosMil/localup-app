import { classifyEmptyDeck, isAgeNarrowed } from './deckEmpty';
import type { DistanceSummary } from '@features/discover/utils/preferences';

const summary = (over: Partial<DistanceSummary> = {}): DistanceSummary => ({
  total: 40,
  p25Km: 4,
  p75Km: 18,
  suggestedKm: 20,
  suggestedCount: 12,
  ...over,
});

const at = (over: Partial<Parameters<typeof classifyEmptyDeck>[0]> = {}) =>
  classifyEmptyDeck({
    summary: summary(),
    currentKm: 10,
    minAge: 18,
    maxAge: 99,
    ...over,
  });

describe('classifyEmptyDeck', () => {
  it('says nothing about distance while the answer is still in flight', () => {
    expect(at({ summary: undefined }).kind).toBe('exhausted');
  });

  it('separates no-fix from nobody-found', () => {
    expect(at({ summary: null }).kind).toBe('locating');
    expect(at({ summary: summary({ total: 0 }) }).kind).toBe('exhausted');
  });

  it('blames the age range only when it was actually narrowed', () => {
    const empty = summary({ total: 0 });
    expect(at({ summary: empty, minAge: 25, maxAge: 52 }).kind).toBe(
      'ageBlocks',
    );
    // Nobody at all on the default range is not an age story.
    expect(at({ summary: empty, minAge: 18, maxAge: 99 }).kind).toBe(
      'exhausted',
    );
  });

  it('offers a one-tap widen while the reach is inside the cap', () => {
    const state = at({ summary: summary({ suggestedKm: 30 }) });
    expect(state).toEqual({
      kind: 'tooTight',
      widenToKm: 30,
      peopleThere: 12,
    });
  });

  // The whole point of the cap: one km past it the button disappears
  // rather than growing a bigger number.
  it('refuses to recommend a single km past the cap', () => {
    const state = at({ summary: summary({ suggestedKm: 35 }) });
    expect(state).toEqual({
      kind: 'tooFar',
      theyAreAtKm: 35,
      peopleThere: 12,
    });
  });

  it('never recommends the absurd radius the maths will happily return', () => {
    expect(at({ summary: summary({ suggestedKm: 215 }) }).kind).toBe('tooFar');
  });

  it('does not call it too tight when the reach is already covered', () => {
    expect(
      at({ summary: summary({ suggestedKm: 10 }), currentKm: 10 }).kind,
    ).toBe('exhausted');
    expect(
      at({ summary: summary({ suggestedKm: 8 }), currentKm: 10 }).kind,
    ).toBe('exhausted');
  });

  // Someone who deliberately went narrow is exactly who the widen button
  // is for, and the default is 10 — so this is the common real case.
  it('offers the widen to someone who narrowed below the default', () => {
    const state = at({
      summary: summary({ suggestedKm: 25, suggestedCount: 38 }),
      currentKm: 5,
    });
    expect(state).toEqual({
      kind: 'tooTight',
      widenToKm: 25,
      peopleThere: 38,
    });
  });
});

describe('isAgeNarrowed', () => {
  it('is false on the defaults and true on either edge', () => {
    expect(isAgeNarrowed(18, 99)).toBe(false);
    expect(isAgeNarrowed(25, 99)).toBe(true);
    expect(isAgeNarrowed(18, 52)).toBe(true);
  });
});
