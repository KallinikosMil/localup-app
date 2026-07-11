import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';

export type OnboardingData = {
  displayName: string;
  dateOfBirth: Date | null;
  homeCity: string;
  homeLat: number | null;
  homeLng: number | null;
  photoUri: string | null;
  interestIds: string[];
  bio: string;
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
  photoUri: null,
  interestIds: [],
  bio: '',
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
