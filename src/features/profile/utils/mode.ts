// The rule the whole app is built on: is this person a local here, or a
// traveler? It is pure arithmetic over two coordinate pairs — no React, no
// network, no store — so it lives on its own rather than inside the hooks
// file it grew up in, where importing it dragged in react-redux and Supabase
// and it could not be tested at all.

export type ProfileMode = 'traveler' | 'local';

// Only what the rule reads. Profile satisfies this structurally, so callers
// pass their full profile and nothing here has to know about the rest of it.
export type ModeInput = {
  home_lat: number | null;
  home_lng: number | null;
  mode_override: ProfileMode | null;
};

export const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const LOCAL_RADIUS_KM = 50;

// Returns null when the mode is genuinely UNKNOWN — i.e. we don't have
// both a home and a current position to compare. It used to return
// 'local' for that case, which is indistinguishable from a real local:
// a traveler's badge read LOCAL for the first frames and then flipped,
// and a user whose coords never arrive was told, confidently and
// permanently, that they are a local. Missing data is not an answer;
// the call sites render a neutral badge for null.
export const computeMode = (
  profile: Partial<ModeInput> | null | undefined,
  currentLat: number | null,
  currentLng: number | null,
): ProfileMode | null => {
  if (profile?.mode_override) {
    return profile.mode_override;
  }
  if (
    profile?.home_lat == null ||
    profile?.home_lng == null ||
    currentLat == null ||
    currentLng == null
  ) {
    return null;
  }
  const dist = haversineKm(
    currentLat,
    currentLng,
    profile.home_lat,
    profile.home_lng,
  );
  return dist > LOCAL_RADIUS_KM ? 'traveler' : 'local';
};
