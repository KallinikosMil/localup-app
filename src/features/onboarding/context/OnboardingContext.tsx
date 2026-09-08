import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';

import { type Politics, type Religion } from '@features/profile/utils/beliefs';

export type OnboardingData = {
  displayName: string;
  dateOfBirth: Date | null;
  homeCity: string;
  homeLat: number | null;
  homeLng: number | null;
  // Ordered, and the first one is the avatar — the same rule the deck
  // and the profile hero already follow. One is required; the rest are
  // optional and can equally be added later from Edit profile.
  photoUris: string[];
  interestIds: string[];
  bio: string;
  // GDPR Article 9 special category, and null is a real answer here, not
  // an empty field waiting to be filled: it is what "Prefer not to say"
  // sends, and the server scores it in the middle of the range rather
  // than at the bottom. Typed as nullable for that reason — there is no
  // sentinel string for "unanswered", because the database CHECK would
  // refuse one and the ranking already understands NULL.
  politics: Politics | null;
  religion: Religion | null;
};

type OnboardingContextValue = {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
};

const initialData: OnboardingData = {
  displayName: '',
  dateOfBirth: null,
  homeCity: '',
  homeLat: null,
  homeLng: null,
  photoUris: [],
  interestIds: [],
  bio: '',
  politics: null,
  religion: null,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [data, setData] = useState<OnboardingData>(initialData);

  const update = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const value = useMemo(() => ({ data, update }), [data, update]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingData = (): OnboardingContextValue => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboardingData must be used within OnboardingProvider');
  }
  return ctx;
};
