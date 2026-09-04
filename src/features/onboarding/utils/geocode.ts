import {
  toCityOptions,
  type CityOption,
  type NominatimPlace,
} from '@features/onboarding/utils/cityOptions';

// The two Nominatim calls step 2 makes, in one place.
//
// Searching lived inside the screen and reverse geocoding did not exist.
// Both have the same failure modes, so both get the same discipline —
// which was already written for the search and is worth stating once:
//
// Nominatim is the only network call the app makes that is NOT a Supabase
// call, so the global 15s fetch timeout in config/supabase.ts does not
// cover it. A hung connection here hangs forever without the timeout
// below, and without the abort a slow earlier response can land after a
// newer one and repopulate a list the user has already moved past.

// Shorter than the app's 15s Supabase budget. A suggestion that arrives
// after eight seconds has been overtaken by the person typing.
const TIMEOUT_MS = 8000;

const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'LocalUp/1.0' };

const call = async <T>(url: string, signal: AbortSignal): Promise<T> => {
  const res = await fetch(url, { headers: HEADERS, signal });
  return (await res.json()) as T;
};

// Wraps a request in its own timeout and reports whether the caller
// should ignore the outcome — an abort means either a newer request
// superseded this one or it ran out of time, and in both cases writing
// its result would be wrong.
const withTimeout = async <T>(
  controller: AbortController,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; aborted: boolean }> => {
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const value = await work(controller.signal);
    if (controller.signal.aborted) return { ok: false, aborted: true };
    return { ok: true, value };
  } catch {
    return { ok: false, aborted: controller.signal.aborted };
  } finally {
    clearTimeout(timer);
  }
};

export const searchCities = async (
  term: string,
  language: string,
  controller: AbortController,
): Promise<CityOption[] | null> => {
  // featureType, NOT featuretype. Nominatim ignores the lowercase
  // spelling silently, so the filter was never applied and a search for
  // "Λαρισα" offered a mountain peak near Argos as its second result.
  const url =
    `${BASE}/search` +
    `?q=${encodeURIComponent(term)}` +
    '&format=json&limit=6&addressdetails=1&featureType=city' +
    `&accept-language=${encodeURIComponent(language)}`;

  const out = await withTimeout(controller, s =>
    call<NominatimPlace[]>(url, s),
  );
  // null means "no answer" — the caller leaves what is on screen alone.
  // An empty array means "asked and there is nothing", which is the
  // no-match state and a different thing entirely.
  if (!out.ok) return null;
  return toCityOptions(out.value ?? []);
};

// Where the phone is, as a city. Only ever a suggestion: the answer is
// offered as a question and never written to the profile on its own.
export const reverseGeocode = async (
  lat: number,
  lng: number,
  language: string,
  controller: AbortController,
): Promise<CityOption | null> => {
  const url =
    `${BASE}/reverse` +
    `?lat=${lat}&lon=${lng}` +
    // zoom=10 is the city level. Higher returns a street, which is both
    // wrong for this field and more precision than we ever want to hold.
    '&format=json&addressdetails=1&zoom=10' +
    `&accept-language=${encodeURIComponent(language)}`;

  const out = await withTimeout(controller, s => call<NominatimPlace>(url, s));
  if (!out.ok || !out.value) return null;

  // Reuse the same parsing as the search rather than reading `address`
  // again by hand: the four-way city/town/village/municipality fallback
  // is the part that took a bug to get right.
  const [city] = toCityOptions([
    { ...out.value, lat: String(lat), lon: String(lng) },
  ]);
  return city ?? null;
};
