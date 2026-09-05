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
  filtersSummary: 'Within {{km}} km of where you are, ages {{min}}–{{max}}.',
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
  discoverEmptySubtitle:
    "You've seen everyone within your range for now. New people show up as they arrive.",
  discoverRefresh: 'Refresh',
  discoverEmptyLocatingTitle: 'Still finding you',
  discoverEmptyLocatingBody:
    'Your location has not come through yet, so there is nothing to measure distance from.',
  discoverEmptyTightTitle: 'Your filters are too tight',
  discoverEmptyTightBody:
    'Nobody is within {{km}} km right now. There are {{count}} people within {{widen}} km.',
  discoverEmptyWiden: 'Widen to {{km}} km',
  discoverEmptyFarTitle: 'Nobody close by right now',
  discoverEmptyFarBody:
    'The nearest {{count}} people are around {{km}} km away — further than most would travel to meet. New people show up as they arrive.',
  discoverEmptyAgeTitle: 'No one in that age range',
  discoverEmptyAgeBody:
    'Distance is not the problem. Nobody around you is aged {{from}}–{{to}} right now, at any radius — widening the km will not change it.',
  discoverOpenFilters: 'Open filters',
  discoverChipKm: '{{km}} km',
  discoverChipAges: '{{from}} – {{to}}',
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
  discoverA11yShowAllInterests: 'Show all {{count}} interests',
  discoverFilters: 'Filters',
};
