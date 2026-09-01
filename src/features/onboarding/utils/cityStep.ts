import type { CityOption } from '@features/onboarding/utils/cityOptions';

// Which of the six faces of step 2 is showing, and what moves between
// them. Redesign §13.
//
// The order used to be backwards: the screen made someone type their city
// by hand, and the app asked for GPS permission a screen later, after
// onboarding had ended. The manual work came first and the thing that
// would have removed it came second.
//
// The rule that shapes all of this: **GPS is a suggestion, never an
// answer.** home_city decides local-or-traveller permanently; GPS says
// where the phone is right now. Someone on their third day in Athens,
// visiting from Berlin, would be detected as Athens and filed as an
// Athens local — the exact person the product exists for, mislabelled for
// good by a convenience. So a detection becomes a QUESTION, and the
// answer "I am visiting" is a first-class path, not an error.

export type CityStep =
  // Map card, "Use my location" as the primary, manual entry under it.
  | 'idle'
  // Locating. The manual link stays live — a cold fix indoors takes
  // 10-30s and nobody should be trapped behind it.
  | 'locating'
  // "Do you live in Athens?" with two answers.
  | 'detected'
  // The manual path: a field, a Search button, and the shortcuts.
  | 'search'
  // Results arrived. A count line, a list, then Next.
  | 'results'
  // Searched and found nothing.
  | 'noMatch';

export type CityState = {
  step: CityStep;
  // Where the phone says it is. A suggestion, never written to the
  // profile without being asked about.
  detected: CityOption | null;
  // Set when the person answered "No, I am visiting". Worth keeping: it
  // says they are a traveller AND where they are right now.
  visitingFrom: CityOption | null;
  // Shown once above the field when the permission was refused. Not a
  // separate screen and never a re-prompt.
  deniedNote: boolean;
  results: CityOption[];
  // The term the results belong to, so the count line cannot describe a
  // query the user has since edited.
  searchedFor: string;
  chosen: CityOption | null;
};

export const initialCityState: CityState = {
  step: 'idle',
  detected: null,
  visitingFrom: null,
  deniedNote: false,
  results: [],
  searchedFor: '',
  chosen: null,
};

export type CityEvent =
  | { type: 'locate' }
  | { type: 'located'; city: CityOption }
  | { type: 'locateFailed' }
  | { type: 'permissionDenied' }
  | { type: 'confirmHome' }
  | { type: 'sayVisiting' }
  | { type: 'goManual' }
  | { type: 'searched'; term: string; results: CityOption[] }
  | { type: 'searchAgain' }
  | { type: 'choose'; city: CityOption };

export const cityReducer = (state: CityState, event: CityEvent): CityState => {
  switch (event.type) {
    case 'locate':
      return { ...state, step: 'locating', deniedNote: false };

    case 'located':
      return { ...state, step: 'detected', detected: event.city };

    // A failed fix is not a dead end and not worth its own screen: it
    // lands on the manual path like every other way of getting there.
    case 'locateFailed':
      return { ...state, step: 'search' };

    case 'permissionDenied':
      return { ...state, step: 'search', deniedNote: true };

    // The detected city is only written once it has been confirmed as
    // HOME, which is the whole point of asking.
    case 'confirmHome':
      return state.detected ? { ...state, chosen: state.detected } : state;

    // Not an error path. It keeps the detection as "where they are now"
    // and sends them to pick their actual home.
    case 'sayVisiting':
      return {
        ...state,
        step: 'search',
        visitingFrom: state.detected,
        chosen: null,
      };

    case 'goManual':
      return { ...state, step: 'search' };

    case 'searched':
      return {
        ...state,
        step: event.results.length > 0 ? 'results' : 'noMatch',
        results: event.results,
        searchedFor: event.term,
        chosen: null,
      };

    case 'searchAgain':
      return { ...state, step: 'search', results: [], searchedFor: '' };

    case 'choose':
      return { ...state, chosen: event.city };

    default:
      return state;
  }
};

// The one-tap rows offered before anyone types. Zero typing is the most
// accessible path there is, so these are populated whenever a fix exists
// — even a stale one.
export const shortcutsFor = (state: CityState): CityOption[] => {
  const out: CityOption[] = [];
  const near = state.detected ?? state.visitingFrom;
  if (near) out.push(near);
  return out;
};

// Step 2 can only advance once a city has been CHOSEN — either confirmed
// as home from the detection, or picked from a search.
export const canAdvance = (state: CityState) => state.chosen !== null;
