export type LanguageCode = 'en' | 'es';

export type LanguageConfig = {
  name: string;
  tutorLabel: string;
  errorTaxonomy: string[];
};

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: {
    name: 'English',
    tutorLabel: 'an English writing tutor',
    errorTaxonomy: [
      'Verb Tense',
      'Subject-Verb Agreement',
      'Articles',
      'Prepositions',
      'Word Choice',
      'Word Order',
      'Spelling',
      'Punctuation',
      'Tone',
      'Style',
    ],
  },
  es: {
    name: 'Spanish',
    tutorLabel: 'a Spanish writing tutor',
    errorTaxonomy: [
      'Gender Agreement',
      'Ser vs Estar',
      'Preterite vs Imperfect',
      'Article Gender & Number',
      'Subjunctive Mood',
      'Adjective Agreement',
      'Por vs Para',
      'Verb Conjugation',
      'Accents & Spelling',
      'Object Pronouns',
      'Gustar-type Verbs',
      'Word Order',
    ],
  },
};

export function languageConfig(code?: LanguageCode): LanguageConfig {
  return LANGUAGES[code ?? 'en'] ?? LANGUAGES.en;
}
