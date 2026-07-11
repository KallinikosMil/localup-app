import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

type Coords = {
  latitude: number;
  longitude: number;
};

type LocationState = {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

// Module-level cache + single-flight (P0 fix 2026-06-10).
// useLocation mounts in several places (tabs layout,
// Discover, Profile, edit) — a fresh GPS request per mount
// meant duplicate concurrent fixes and, on emulators with
// no GPS simulation, a 15-30s hang on every remount
// (Discover cold open, edit→cancel). Remounts now read the
// cache instantly and share ONE in-flight acquisition:
//   1) getLastKnownPositionAsync → instant, possibly stale
//      (fine: the deck is computed from the persisted DB
//      location anyway; the 5km-drift invalidation corrects
//      the deck if the user actually moved)
//   2) getCurrentPositionAsync refines in the background.
let cachedCoords: Coords | null = null;
let inFlight: Promise<void> | null = null;

type Listener = (coords: Coords | null, error: string | null) => void;
const listeners = new Set<Listener>();

const notify = (coords: Coords | null, error: string | null) => {
  if (coords) {
    cachedCoords = coords;
  }
  listeners.forEach(l => l(coords, error));
};

const acquire = async (): Promise<void> => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    notify(null, 'Location permission denied');
    return;
  }

  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) {
      notify(
        {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        },
        null,
      );
    }
  } catch {
    // non-fatal — fresh fix below
  }

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    notify(
      {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      },
      null,
    );
  } catch {
    if (!cachedCoords) {
      notify(null, 'Could not get location');
    }
  }
};

const ensure = (): Promise<void> => {
  if (!inFlight) {
    inFlight = acquire().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
};

const useLocation = (): LocationState => {
  const [coords, setCoords] = useState<Coords | null>(cachedCoords);
  const [loading, setLoading] = useState(cachedCoords == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener: Listener = (c, e) => {
      if (c) {
        setCoords(c);
        setError(null);
      }
      if (e) {
        setError(e);
      }
      setLoading(false);
    };
    listeners.add(listener);
    void ensure();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    loading,
    error,
    refresh: ensure,
  };
};

export default useLocation;
