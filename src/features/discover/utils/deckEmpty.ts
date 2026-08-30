import {
  PREF_DEFAULTS,
  SUGGEST_CAP_KM,
  type DistanceSummary,
} from '@features/discover/utils/preferences';

// Why an empty deck is empty.
//
// "No one nearby — check back later" was the only answer the deck could
// give, and for a lot of people it was the wrong one: their filters were
// what emptied it, and the fix was one tap away. But the opposite mistake
// is worse. Telling someone to widen when the nearest ten people are two
// hundred kilometres out sends them to a second empty deck, having burned
// the one suggestion they were going to trust.
//
// So this returns a KIND, and each kind has copy that is true of it. Pure
// input to output, no queries — the screen renders what it is told.

export type DeckEmptyKind =
  // The location has not reported yet, so nothing about distance can be
  // claimed honestly.
  | 'locating'
  // Nobody at ANY distance in this age range, and the range is narrowed.
  // Widening the radius cannot help; the age is what excludes everyone.
  | 'ageBlocks'
  // People exist further out, and "further out" is close enough to offer
  // with one tap.
  | 'tooTight'
  // People exist, but only past the line we are willing to recommend.
  // State the fact, hand over the filters, point at no number.
  | 'tooFar'
  // The filters are not the story. Nobody is around yet.
  | 'exhausted';

export type DeckEmptyState =
  | { kind: 'locating' | 'ageBlocks' | 'exhausted' }
  // The radius that would reach a full deck, and how many that is.
  | { kind: 'tooTight'; widenToKm: number; peopleThere: number }
  // Same two numbers — but shown as a fact rather than a button.
  | { kind: 'tooFar'; theyAreAtKm: number; peopleThere: number };

export const isAgeNarrowed = (minAge: number, maxAge: number) =>
  minAge > PREF_DEFAULTS.minAge || maxAge < PREF_DEFAULTS.maxAge;

export const classifyEmptyDeck = ({
  summary,
  currentKm,
  minAge,
  maxAge,
}: {
  // undefined while the query is in flight, null when there is no fix.
  summary: DistanceSummary | null | undefined;
  currentKm: number;
  minAge: number;
  maxAge: number;
}): DeckEmptyState => {
  // In flight is not the same as absent. Until the answer lands the only
  // honest screen is the neutral one — a "your filters are too tight"
  // that appears and then retracts is worse than a beat of nothing.
  if (summary === undefined) return { kind: 'exhausted' };
  if (summary === null) return { kind: 'locating' };

  if (summary.total === 0) {
    // Nobody at any distance. That is only an AGE story if the range was
    // actually narrowed — on the default 18-99 it just means nobody is
    // out there, and blaming the age would be a lie with a button on it.
    return { kind: isAgeNarrowed(minAge, maxAge) ? 'ageBlocks' : 'exhausted' };
  }

  // People exist somewhere, but not further out than where we already
  // look — so widening is not the lever. Rare, and usually a cache that
  // is a moment behind the deck.
  if (summary.suggestedKm <= currentKm) return { kind: 'exhausted' };

  if (summary.suggestedKm > SUGGEST_CAP_KM) {
    return {
      kind: 'tooFar',
      theyAreAtKm: summary.suggestedKm,
      peopleThere: summary.suggestedCount,
    };
  }

  return {
    kind: 'tooTight',
    widenToKm: summary.suggestedKm,
    peopleThere: summary.suggestedCount,
  };
};
