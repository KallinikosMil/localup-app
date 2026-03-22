import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

type LocationState = {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const useLocation = (): LocationState => {
  const [latitude, setLatitude] =
    useState<number | null>(null);
  const [longitude, setLongitude] =
    useState<number | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);

    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setError(
        'Location permission denied',
      );
      setLoading(false);
      return;
    }

    try {
      const loc =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.Balanced,
          },
        );
      setLatitude(loc.coords.latitude);
      setLongitude(
        loc.coords.longitude,
      );
    } catch {
      setError(
        'Could not get location',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return {
    latitude,
    longitude,
    loading,
    error,
    refresh: fetchLocation,
  };
};

export default useLocation;
