export type Goal = 'business' | 'academic' | 'exam' | 'casual' | 'creative';

export type FocusArea = 'grammar' | 'vocabulary' | 'tone' | 'fluency';

export type Level = 'A2' | 'B1' | 'B2' | 'C1';

export type Profile = {
  level: Level;
  goal: Goal;
  nativeLanguage: string | null;
  focusAreas: FocusArea[];
  completedAt: string | null;
  lastLevelAdjustAt?: number | null;
  notificationsEnabled?: boolean;
  targetLanguage?: 'en' | 'es';
  explanationLanguage?: 'en' | 'es';
  modelVariant?: 'full' | 'small';
};

export type DiagnosticQuestion = {
  id: string;
  tag: string;
  prompt: string;
  options: string[];
  answerIndex: number;
};

export type Correction = {
  original_phrase: string;
  corrected_phrase: string;
  error_type: string;
  explanation: string;
  quick_tip: string;
};

export type Evaluation = {
  has_errors: boolean;
  corrections: Correction[];
  improved_paragraph: string;
  strengths: string;
};

export type SessionSummary = {
  id: string;
  createdAt: number;
  prompt: string;
  response: string;
  evaluation: Evaluation | null;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Exercise: { sessionId: string };
  Feedback: { sessionId: string };
  SessionDetail: { sessionId: string };
  Lesson: { questionId: string };
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  DiagnosticTest: undefined;
  DiagnosticResult: undefined;
  Goals: undefined;
  NativeLanguage: undefined;
  FocusAreas: undefined;
  ModelDownload: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Progress: undefined;
  Settings: undefined;
};
