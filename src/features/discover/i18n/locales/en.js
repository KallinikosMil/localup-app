export default {
  discoverTitle: 'LocalUp',
  discoverTabTitle: 'Discover',
  filtersTitle: 'Search filters',
  filtersDistance: 'Distance',
  filtersAge: 'Age',
  filtersDistanceRange: '{{min}} – {{max}} km',
  filtersAgeRange: '{{min}} – {{max}}',
  filtersKm: '{{km}} km',
  filtersAgeValue: '{{min}} – {{max}}',
  filtersMatchLocals: '{{count}} locals match right now',
  filtersMatchTravelers: '{{count}} travellers match right now',
  filtersSummary: 'Within {{km}} km of {{city}}, ages {{min}}–{{max}}.',
  filtersNarrowLocals: 'Only {{count}} locals this close',
  filtersNarrowTravelers: 'Only {{count}} travellers this close',
  filtersNarrowBody:
    'Most people near you are {{from}}–{{to}} km away. At {{km}} km your deck runs out in a day and the app will look empty.',
  filtersWiden: 'Widen to {{km}} km',
  filtersAgeBlocks:
    'Nobody matches these ages at any distance. Widening the radius will not help — the age range is what is excluding everyone.',
  filtersModeTitle: 'You always see the other side',
  filtersModeBody:
    'Travellers meet locals, locals meet travellers. That is the app itself, not a preference — so there is nothing to switch here.',
  filtersReset: 'Reset to defaults',
  filtersSaveError: "Couldn't save your filters. Please try again.",
  discoverEmptyTitle: 'No one nearby',
  discoverEmptySubtitle: 'Check back later for new people',
  discoverRefresh: 'Refresh',
  discoverWaking: 'Waking the server…',
  discoverError: "Couldn't load people near you.",
  discoverRetry: 'Retry',
  discoverMatchTitle: "It's a Match!",
  discoverMatchBody: 'You and {{name}} both want to meet',
  discoverMatchCta: 'Keep Swiping',
  // V10: "— check your connection" is commonErrorOffline's job now, and
  // it's only shown when the error actually says so.
  discoverSwipeError: "Swipe didn't go through. Please try again.",
  discoverDistanceNearby: 'nearby',
  discoverDistanceKm: '{{km}} km',
  discoverStampLike: 'MEET',
  discoverStampNope: 'PASS',
  // A format string, not a concatenation: Greek and English happen to
  // agree here, but the separator is a translator's decision.
  discoverNameAge: '{{name}}, {{age}}',
  discoverA11yNextPhoto: 'Photo {{current}} of {{total}}. Tap to change.',
  discoverFilters: 'Filters',
};
