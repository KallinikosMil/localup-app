import { toCityOptions, type NominatimPlace } from './cityOptions';

const place = (over: Partial<NominatimPlace>): NominatimPlace => ({
  place_id: 1,
  display_name: 'Somewhere',
  lat: '1',
  lon: '2',
  ...over,
});

describe('toCityOptions', () => {
  // The bug this was written for: Larisa came back as eight components of
  // administrative hierarchy and all of it was stored as the home city.
  it('reduces the hierarchy to the city and its country', () => {
    const [row] = toCityOptions([
      place({
        display_name:
          'Λάρισα, Δημοτική Ενότητα Λαρισαίων, Δήμος Λαρισαίων, ' +
          'Περιφερειακή Ενότητα Λάρισας, Περιφέρεια Θεσσαλίας, ' +
          'Αποκεντρωμένη Διοίκηση Θεσσαλίας - Στερεάς Ελλάδος, 422 22, Ελλάς',
        address: {
          city: 'Λάρισα',
          municipality: 'Δήμος Λαρισαίων',
          state: 'Περιφέρεια Θεσσαλίας',
          country: 'Ελλάδα',
        },
      }),
    ]);
    expect(row.name).toBe('Λάρισα');
    expect(row.region).toBe('Ελλάδα');
  });

  it('falls back through town, village and municipality', () => {
    const names = toCityOptions([
      place({ place_id: 1, address: { town: 'Nafplio', country: 'Greece' } }),
      place({ place_id: 2, address: { village: 'Oia', country: 'Greece' } }),
      place({
        place_id: 3,
        address: { municipality: 'Δήμος Κω', country: 'Greece' },
      }),
    ]).map(r => r.name);
    expect(names).toEqual(['Nafplio', 'Oia', 'Δήμος Κω']);
  });

  it('uses the leaf of display_name when no address came back', () => {
    const [row] = toCityOptions([
      place({ display_name: 'Athlone, Westmeath, Ireland' }),
    ]);
    expect(row.name).toBe('Athlone');
  });

  // The region line exists to disambiguate, so it should only do that
  // work where there is ambiguity to resolve.
  it('adds the state only when two results share a name', () => {
    const rows = toCityOptions([
      place({
        place_id: 1,
        address: { city: 'Athens', state: 'Attica', country: 'Greece' },
      }),
      place({
        place_id: 2,
        address: {
          city: 'Athens',
          state: 'Georgia',
          country: 'United States',
        },
      }),
      place({
        place_id: 3,
        address: { city: 'Athlone', state: 'Westmeath', country: 'Ireland' },
      }),
    ]);
    expect(rows.map(r => r.region)).toEqual([
      'Attica, Greece',
      'Georgia, United States',
      'Ireland',
    ]);
  });

  // Searching "Ath" really does return the Belgian town twice.
  it('drops rows that reduce to the same label', () => {
    const rows = toCityOptions([
      place({
        place_id: 1,
        address: { city: 'Ath', state: 'Hainaut', country: 'Belgium' },
      }),
      place({
        place_id: 2,
        address: { city: 'Ath', state: 'Hainaut', country: 'Belgium' },
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].region).toBe('Belgium');
  });

  it('drops rows that cannot be stored', () => {
    const rows = toCityOptions([
      place({ place_id: 1, display_name: '', address: {} }),
      place({ place_id: 2, lat: 'nonsense', address: { city: 'Nowhere' } }),
    ]);
    expect(rows).toEqual([]);
  });
});
