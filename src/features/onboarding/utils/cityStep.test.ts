import {
  canAdvance,
  cityReducer,
  initialCityState,
  shortcutsFor,
  type CityState,
} from './cityStep';
import type { CityOption } from './cityOptions';

const athens: CityOption = {
  placeId: 1,
  name: 'Athens',
  region: 'Greece',
  lat: 37.98,
  lng: 23.73,
};
const berlin: CityOption = {
  placeId: 2,
  name: 'Berlin',
  region: 'Germany',
  lat: 52.52,
  lng: 13.4,
};

const run = (events: Parameters<typeof cityReducer>[1][]): CityState =>
  events.reduce(cityReducer, initialCityState);

describe('the happy path', () => {
  it('goes idle → locating → detected', () => {
    const s = run([{ type: 'locate' }, { type: 'located', city: athens }]);
    expect(s.step).toBe('detected');
    expect(s.detected).toEqual(athens);
  });

  // The whole reason the detection is a question.
  it('does NOT choose a city just because one was detected', () => {
    const s = run([{ type: 'locate' }, { type: 'located', city: athens }]);
    expect(s.chosen).toBeNull();
    expect(canAdvance(s)).toBe(false);
  });

  it('chooses it only once it is confirmed as home', () => {
    const s = run([
      { type: 'locate' },
      { type: 'located', city: athens },
      { type: 'confirmHome' },
    ]);
    expect(s.chosen).toEqual(athens);
    expect(canAdvance(s)).toBe(true);
  });
});

describe('"No, I am visiting" is a path, not an error', () => {
  const s = run([
    { type: 'locate' },
    { type: 'located', city: athens },
    { type: 'sayVisiting' },
  ]);

  it('opens the search rather than failing', () => {
    expect(s.step).toBe('search');
  });

  // The point of the whole design: a traveller must not be filed as a
  // local just because their phone is here.
  it('never writes the detected city as home', () => {
    expect(s.chosen).toBeNull();
  });

  it('keeps where they are now, because that is worth knowing', () => {
    expect(s.visitingFrom).toEqual(athens);
  });

  it('still lets them pick their real home afterwards', () => {
    const done = cityReducer(s, { type: 'choose', city: berlin });
    expect(done.chosen).toEqual(berlin);
    expect(done.visitingFrom).toEqual(athens);
    expect(canAdvance(done)).toBe(true);
  });
});

describe('nobody is ever trapped behind GPS', () => {
  it('sends a refused permission to the manual path with a note', () => {
    const s = run([{ type: 'locate' }, { type: 'permissionDenied' }]);
    expect(s.step).toBe('search');
    expect(s.deniedNote).toBe(true);
  });

  it('sends a failed fix to the same place, without the note', () => {
    const s = run([{ type: 'locate' }, { type: 'locateFailed' }]);
    expect(s.step).toBe('search');
    expect(s.deniedNote).toBe(false);
  });

  it('lets someone skip straight to typing from the start', () => {
    expect(run([{ type: 'goManual' }]).step).toBe('search');
  });

  it('clears a stale denial note when locating is retried', () => {
    const s = run([
      { type: 'locate' },
      { type: 'permissionDenied' },
      { type: 'locate' },
    ]);
    expect(s.deniedNote).toBe(false);
  });
});

describe('searching', () => {
  it('shows results when there are any', () => {
    const s = run([
      { type: 'goManual' },
      { type: 'searched', term: 'Berlin', results: [berlin] },
    ]);
    expect(s.step).toBe('results');
    expect(s.searchedFor).toBe('Berlin');
  });

  it('shows the no-match state when there are none', () => {
    const s = run([
      { type: 'goManual' },
      { type: 'searched', term: 'Berlinnn', results: [] },
    ]);
    expect(s.step).toBe('noMatch');
    expect(s.searchedFor).toBe('Berlinnn');
  });

  // The count line names the term, so it must never describe a query the
  // results do not belong to.
  it('keeps the term the results belong to', () => {
    const s = run([
      { type: 'goManual' },
      { type: 'searched', term: 'Berlin', results: [berlin] },
      { type: 'searchAgain' },
    ]);
    expect(s.searchedFor).toBe('');
    expect(s.results).toEqual([]);
  });

  it('drops a previous choice when a new search lands', () => {
    const s = run([
      { type: 'goManual' },
      { type: 'searched', term: 'Berlin', results: [berlin] },
      { type: 'choose', city: berlin },
      { type: 'searched', term: 'Athens', results: [athens] },
    ]);
    expect(s.chosen).toBeNull();
  });
});

describe('shortcuts', () => {
  it('offers nothing before any fix', () => {
    expect(shortcutsFor(initialCityState)).toEqual([]);
  });

  it('offers the detected city', () => {
    const s = run([{ type: 'locate' }, { type: 'located', city: athens }]);
    expect(shortcutsFor(s)).toEqual([athens]);
  });

  // Still offered after "I am visiting" — a stale fix is better than
  // making someone type.
  it('still offers it once they have said they are visiting', () => {
    const s = run([
      { type: 'locate' },
      { type: 'located', city: athens },
      { type: 'sayVisiting' },
    ]);
    expect(shortcutsFor(s)).toEqual([athens]);
  });
});
