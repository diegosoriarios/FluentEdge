import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { FocusArea, Goal, Level } from '../navigation/types';

export type OnboardingDraft = {
  answers: Record<string, number>;
  level: Level | null;
  weakAreas: string[];
  goal: Goal | null;
  nativeLanguage: string | null;
  focusAreas: FocusArea[];
};

const INITIAL_DRAFT: OnboardingDraft = {
  answers: {},
  level: null,
  weakAreas: [],
  goal: null,
  nativeLanguage: null,
  focusAreas: [],
};

type OnboardingContextValue = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL_DRAFT);

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setDraft(INITIAL_DRAFT);
  }, []);

  const value = useMemo(
    () => ({ draft, update, reset }),
    [draft, update, reset],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return value;
}
