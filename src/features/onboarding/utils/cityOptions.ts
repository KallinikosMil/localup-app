// Turns Nominatim's answer into something a person can read.
//
// `display_name` is the whole administrative hierarchy, root to leaf. For
// Larisa that is eight components ending in a postcode and "Ελλάς" — and
// we were showing it in the list AND storing it as the user's home city,
// so a profile said all of that where it meant to say "Λάρισα".
//
// Everything needed for a short label is already in `address`, which we
// were requesting (addressdetails=1) and never reading.

export type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
};

export type NominatimPlace = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: NominatimAddress;
};

export type CityOption = {
  placeId: number;
  // What gets stored and shown everywhere afterwards: "Λάρισα".
  name: string;
  // The line under it, which exists to tell two same-named places apart.
  region: string;
  lat: number;
  lng: number;
};

// Nominatim classifies a settlement as exactly one of these depending on
// its size, so all four have to be tried. `municipality` last: it is the
// administrative unit ("Δήμος Λαρισαίων"), not the place, and is only
// better than nothing.
const placeName = (p: NominatimPlace): string => {
  const a = p.address ?? {};
  const named = a.city ?? a.town ?? a.village ?? a.municipality ?? p.name;
  if (named) return named;
  // No address details came back. The leaf of display_name is still the
  // place itself, and is far better than the whole chain.
  return p.display_name.split(',')[0]?.trim() ?? '';
};

export const toCityOptions = (places: NominatimPlace[]): CityOption[] => {
  const rows = places
    .map(p => ({
      placeId: p.place_id,
      name: placeName(p),
      state: p.address?.state ?? '',
      country: p.address?.country ?? '',
      lat: parseFloat(p.lat),
      lng: parseFloat(p.lon),
    }))
    // A row with no name or no coordinates cannot be chosen or stored.
    .filter(r => r.name !== '' && !Number.isNaN(r.lat) && !Number.isNaN(r.lng));

  // Nominatim happily returns the same place twice — searching "Ath"
  // gives two identical rows for the Belgian town. Drop those BEFORE
  // counting names, or a place duplicated against itself looks like two
  // places sharing a name and gets a qualifier it does not need.
  const unique = [];
  const seenPlace = new Set();
  for (const r of rows) {
    const key = `${r.name}|${r.state}|${r.country}`;
    if (seenPlace.has(key)) continue;
    seenPlace.add(key);
    unique.push(r);
  }

  // The region line carries the state ONLY where it does work. "Athens"
  // and "Athens" need "Greece" and "Georgia, United States" to be told
  // apart; a lone "Athlone" does not need "Westmeath" to say Ireland.
  const nameCounts = new Map();
  for (const r of unique) {
    nameCounts.set(r.name, (nameCounts.get(r.name) ?? 0) + 1);
  }

  return unique.map(r => {
    const ambiguous = (nameCounts.get(r.name) ?? 0) > 1;
    return {
      placeId: r.placeId,
      name: r.name,
      region: ambiguous && r.state ? `${r.state}, ${r.country}` : r.country,
      lat: r.lat,
      lng: r.lng,
    };
  });
};
