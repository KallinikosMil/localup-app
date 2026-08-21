import {
  LOCAL_RADIUS_KM,
  computeMode,
  haversineKm,
  type ModeInput,
} from './mode';

// Only the fields computeMode reads, so each case shows exactly what it is
// about and nothing else.
const profile = (fields: Partial<ModeInput>): Partial<ModeInput> => fields;

const ATHENS = { lat: 37.9838, lng: 23.7275 };
const THESSALONIKI = { lat: 40.6401, lng: 22.9444 }; // ~300 km from Athens
const PIRAEUS = { lat: 37.9422, lng: 23.6469 }; // ~9 km from Athens

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(ATHENS.lat, ATHENS.lng, ATHENS.lat, ATHENS.lng)).toBe(0);
  });

  it('measures Athens to Thessaloniki at roughly 300 km', () => {
    const d = haversineKm(
      ATHENS.lat,
      ATHENS.lng,
      THESSALONIKI.lat,
      THESSALONIKI.lng,
    );
    expect(d).toBeGreaterThan(280);
    expect(d).toBeLessThan(320);
  });

  it('is symmetric', () => {
    const there = haversineKm(
      ATHENS.lat,
      ATHENS.lng,
      THESSALONIKI.lat,
      THESSALONIKI.lng,
    );
    const back = haversineKm(
      THESSALONIKI.lat,
      THESSALONIKI.lng,
      ATHENS.lat,
      ATHENS.lng,
    );
    expect(there).toBeCloseTo(back, 6);
  });
});

describe('computeMode', () => {
  it('calls someone near their home base a local', () => {
    const mode = computeMode(
      profile({ home_lat: ATHENS.lat, home_lng: ATHENS.lng }),
      PIRAEUS.lat,
      PIRAEUS.lng,
    );
    expect(mode).toBe('local');
  });

  it('calls someone far from their home base a traveler', () => {
    const mode = computeMode(
      profile({ home_lat: ATHENS.lat, home_lng: ATHENS.lng }),
      THESSALONIKI.lat,
      THESSALONIKI.lng,
    );
    expect(mode).toBe('traveler');
  });

  it('treats exactly the radius as still local', () => {
    // Due north of Athens by exactly LOCAL_RADIUS_KM. The rule is
    // `dist > radius ? traveler : local`, so the boundary belongs to local.
    const northLat = ATHENS.lat + LOCAL_RADIUS_KM / 111.32;
    const mode = computeMode(
      profile({ home_lat: ATHENS.lat, home_lng: ATHENS.lng }),
      northLat,
      ATHENS.lng,
    );
    expect(mode).toBe('local');
  });

  // The bug this null was introduced for: returning 'local' when the mode is
  // unknown is indistinguishable from a real local, so a traveler's badge
  // read LOCAL for the first frames and then flipped — and a user whose
  // coordinates never arrive was told, permanently and confidently, that
  // they are a local. Missing data is not an answer.
  it('returns null with a home base but no current position', () => {
    const p = profile({ home_lat: ATHENS.lat, home_lng: ATHENS.lng });
    expect(computeMode(p, null, null)).toBeNull();
  });

  it('returns null with a current position but no home base', () => {
    expect(computeMode(profile({}), ATHENS.lat, ATHENS.lng)).toBeNull();
  });

  it('returns null with neither', () => {
    expect(computeMode(profile({}), null, null)).toBeNull();
  });

  it('returns null for a missing profile', () => {
    expect(computeMode(null, ATHENS.lat, ATHENS.lng)).toBeNull();
    expect(computeMode(undefined, ATHENS.lat, ATHENS.lng)).toBeNull();
  });

  // The override is the user's stated intent and outranks geography — it must
  // win even when the coordinates say the opposite, and even when they are
  // missing entirely.
  it('lets an explicit override win over the coordinates', () => {
    const mode = computeMode(
      profile({
        home_lat: ATHENS.lat,
        home_lng: ATHENS.lng,
        mode_override: 'traveler',
      }),
      PIRAEUS.lat,
      PIRAEUS.lng,
    );
    expect(mode).toBe('traveler');
  });

  it('applies the override even with no position at all', () => {
    expect(computeMode(profile({ mode_override: 'local' }), null, null)).toBe(
      'local',
    );
  });
});
