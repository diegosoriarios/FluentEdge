import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearProfileRow,
  getProfileRow,
  saveProfileRow,
} from '../data';
import type { Profile } from '../navigation/types';
import type { OnboardingDraft } from './OnboardingContext';

type ProfileContextValue = {
  loading: boolean;
  profile: Profile | null;
  isComplete: boolean;
  saveProfile: (profile: Profile) => Promise<void>;
  completeOnboarding: (draft: OnboardingDraft) => Promise<void>;
  resetProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfileRow()
      .then(json => {
        if (!cancelled && json) {
          setProfile(JSON.parse(json) as Profile);
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.warn('Failed to load profile', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback(async (next: Profile) => {
    await saveProfileRow(JSON.stringify(next));
    setProfile(next);
  }, []);

  const completeOnboarding = useCallback(
    async (draft: OnboardingDraft) => {
      const next: Profile = {
        level: draft.level ?? 'B1',
        goal: draft.goal ?? 'casual',
        nativeLanguage: draft.nativeLanguage,
        focusAreas: draft.focusAreas.length > 0 ? draft.focusAreas : ['grammar'],
        completedAt: new Date().toISOString(),
        lastLevelAdjustAt: null,
      };
      await saveProfile(next);
    },
    [saveProfile],
  );

  const resetProfile = useCallback(async () => {
    await clearProfileRow();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      profile,
      isComplete: profile?.completedAt != null,
      saveProfile,
      completeOnboarding,
      resetProfile,
    }),
    [loading, profile, saveProfile, completeOnboarding, resetProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return value;
}
