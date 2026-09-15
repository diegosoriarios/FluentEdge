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
  getProfileRow,
  saveProfileRow,
} from '../data';
import type { Profile } from '../navigation/types';
import type { OnboardingDraft } from './OnboardingContext';

type ProfileContextValue = {
  loading: boolean;
  profile: Profile | null;
  isComplete: boolean;
  retaking: boolean;
  saveProfile: (profile: Profile) => Promise<void>;
  completeOnboarding: (draft: OnboardingDraft) => Promise<void>;
  startRetake: () => void;
  cancelRetake: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [retaking, setRetaking] = useState(false);

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
      setRetaking(false);
    },
    [saveProfile],
  );

  const startRetake = useCallback(() => {
    setRetaking(true);
  }, []);

  const cancelRetake = useCallback(() => {
    setRetaking(false);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      profile,
      isComplete: profile?.completedAt != null,
      retaking,
      saveProfile,
      completeOnboarding,
      startRetake,
      cancelRetake,
    }),
    [loading, profile, retaking, saveProfile, completeOnboarding, startRetake, cancelRetake],
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
