import type { Profile } from '../../navigation/types';
import {
  buildGradingSystemPrompt,
  buildPromptGenSystemPrompt,
  cleanGeneratedPrompt,
  isEvaluation,
  isLowQualityPrompt,
  parseEvaluation,
} from '../tutor';

const PROFILE: Profile = {
  level: 'B1',
  goal: 'business',
  nativeLanguage: 'Portuguese',
  focusAreas: ['grammar', 'tone'],
  completedAt: '2026-09-12T00:00:00.000Z',
};

const VALID_EVALUATION = {
  has_errors: true,
  corrections: [
    {
      original_phrase: 'he go to school',
      corrected_phrase: 'he goes to school',
      error_type: 'Subject-Verb Agreement',
      explanation: 'Third person singular takes -s in present simple.',
      quick_tip: 'He/she/it + verb-s.',
    },
  ],
  improved_paragraph: 'He goes to school every day.',
  strengths: 'Good vocabulary range.',
};

describe('buildGradingSystemPrompt', () => {
  it('includes profile fields and weak spots summary', () => {
    const prompt = buildGradingSystemPrompt(
      PROFILE,
      'verb_tense:12, articles:3',
    );
    expect(prompt).toContain('- Level: B1');
    expect(prompt).toContain('- Native language: Portuguese');
    expect(prompt).toContain('- Goal: business');
    expect(prompt).toContain('- Focus: grammar, tone');
    expect(prompt).toContain('- Recurring mistakes: verb_tense:12, articles:3');
    expect(prompt).toContain('Respond ONLY with JSON matching the given schema.');
  });

  it('omits the recurring mistakes line when the summary is empty', () => {
    const prompt = buildGradingSystemPrompt(PROFILE, '');
    expect(prompt).not.toContain('Recurring mistakes');
  });

  it('falls back when native language is missing and focus is empty', () => {
    const prompt = buildGradingSystemPrompt({
      ...PROFILE,
      nativeLanguage: null,
      focusAreas: [],
    });
    expect(prompt).toContain('- Native language: not provided');
    expect(prompt).toContain('- Focus: grammar');
  });
});

describe('buildPromptGenSystemPrompt', () => {
  it('targets prompt generation and includes the profile', () => {
    const prompt = buildPromptGenSystemPrompt(PROFILE, 'word_choice:7');
    expect(prompt).toContain('Write one practice prompt');
    expect(prompt).toContain('- Level: B1');
    expect(prompt).toContain('- Recurring mistakes: word_choice:7');
    expect(prompt).toContain('Respond ONLY with the prompt text.');
    expect(prompt).not.toContain('JSON');
  });

  it('omits the recurring mistakes line when the summary is empty', () => {
    const prompt = buildPromptGenSystemPrompt(PROFILE, '');
    expect(prompt).not.toContain('Recurring mistakes');
  });

  it('forbids fill-in-the-blank and multiple-choice tasks', () => {
    const prompt = buildPromptGenSystemPrompt(PROFILE, '');
    expect(prompt).toContain(
      'Never write fill-in-the-blank, multiple-choice, matching, or single-word-answer tasks.',
    );
    expect(prompt).toContain('The task must be open-ended');
  });
});

describe('isLowQualityPrompt', () => {
  it('rejects fill-in-the-blank prompts', () => {
    expect(isLowQualityPrompt('I ___ here since 2019.')).toBe(true);
    expect(isLowQualityPrompt('She __ the report yesterday.')).toBe(true);
  });

  it('rejects explicit fill-blank or choose instructions', () => {
    expect(isLowQualityPrompt('Fill in the blank with the right word.')).toBe(
      true,
    );
    expect(
      isLowQualityPrompt('Choose the correct option to complete the sentence.'),
    ).toBe(true);
  });

  it('rejects multiple-choice option lists', () => {
    expect(
      isLowQualityPrompt(
        'Which sentence is correct?\na) We discussed about the plan.\nb) We discussed the plan.',
      ),
    ).toBe(true);
    expect(
      isLowQualityPrompt('Pick one:\n(A) email\n(B) report\n(C) memo'),
    ).toBe(true);
  });

  it('accepts open-ended writing prompts', () => {
    expect(
      isLowQualityPrompt(
        'Write a short email to a colleague apologizing for missing a meeting and proposing a new time.',
      ),
    ).toBe(false);
    expect(
      isLowQualityPrompt(
        'Describe a city street as if it were a character with a personality.',
      ),
    ).toBe(false);
  });
});

describe('language parameterization', () => {
  it('builds a Spanish grading prompt with taxonomy and explanation language', () => {
    const prompt = buildGradingSystemPrompt(
      { ...PROFILE, targetLanguage: 'es', explanationLanguage: 'en' },
      'ser_vs_estar:4',
    );
    expect(prompt).toContain('You are a Spanish writing tutor.');
    expect(prompt).toContain('- Explanation language: English');
    expect(prompt).toContain('Ser vs Estar');
    expect(prompt).toContain('natural Spanish');
    expect(prompt).toContain('in English');
  });

  it('defaults the explanation language to the target language', () => {
    const prompt = buildGradingSystemPrompt({ ...PROFILE, targetLanguage: 'es' });
    expect(prompt).toContain('- Explanation language: Spanish');
  });

  it('targets Spanish in prompt generation', () => {
    const prompt = buildPromptGenSystemPrompt({ ...PROFILE, targetLanguage: 'es' });
    expect(prompt).toContain('You are a Spanish writing tutor.');
    expect(prompt).toContain('in Spanish');
  });

  it('defaults to English when no language is set', () => {
    const prompt = buildGradingSystemPrompt(PROFILE);
    expect(prompt).toContain('You are an English writing tutor.');
    expect(prompt).toContain('Verb Tense');
  });
});

describe('cleanGeneratedPrompt', () => {
  it('keeps plain text as-is', () => {
    expect(cleanGeneratedPrompt('  Describe your morning routine. ')).toBe(
      'Describe your morning routine.',
    );
  });

  it('strips markdown fences', () => {
    expect(cleanGeneratedPrompt('```\nDescribe your city.\n```')).toBe(
      'Describe your city.',
    );
  });

  it('strips wrapping quotes', () => {
    expect(cleanGeneratedPrompt('"Describe your city."')).toBe(
      'Describe your city.',
    );
  });
});

describe('isEvaluation', () => {
  it('accepts a valid evaluation', () => {
    expect(isEvaluation(VALID_EVALUATION)).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isEvaluation(null)).toBe(false);
    expect(isEvaluation('text')).toBe(false);
    expect(isEvaluation([])).toBe(false);
  });

  it('rejects wrong field types', () => {
    expect(isEvaluation({ ...VALID_EVALUATION, has_errors: 'yes' })).toBe(false);
    expect(
      isEvaluation({ ...VALID_EVALUATION, corrections: 'none' }),
    ).toBe(false);
  });

  it('rejects corrections with missing fields', () => {
    const broken = {
      ...VALID_EVALUATION,
      corrections: [{ original_phrase: 'x' }],
    };
    expect(isEvaluation(broken)).toBe(false);
  });
});

describe('parseEvaluation', () => {
  it('parses plain JSON', () => {
    expect(parseEvaluation(JSON.stringify(VALID_EVALUATION))).toEqual(
      VALID_EVALUATION,
    );
  });

  it('parses JSON wrapped in markdown fences', () => {
    const fenced = '```json\n' + JSON.stringify(VALID_EVALUATION) + '\n```';
    expect(parseEvaluation(fenced)).toEqual(VALID_EVALUATION);
  });

  it('parses JSON wrapped in XML-style tags', () => {
    const tagged = '<json>\n' + JSON.stringify(VALID_EVALUATION) + '\n</json>';
    expect(parseEvaluation(tagged)).toEqual(VALID_EVALUATION);
  });

  it('parses JSON with prose before and after', () => {
    const noisy =
      'Here is my evaluation:\n' +
      JSON.stringify(VALID_EVALUATION) +
      '\nHope this helps!';
    expect(parseEvaluation(noisy)).toEqual(VALID_EVALUATION);
  });

  it('throws when no JSON object is present', () => {
    expect(() => parseEvaluation('<json>no object here</json>')).toThrow();
  });

  it('throws on malformed JSON', () => {
    expect(() => parseEvaluation('{not json}')).toThrow();
  });

  it('throws on schema-violating JSON', () => {
    expect(() => parseEvaluation('{"has_errors": true}')).toThrow();
  });
});
