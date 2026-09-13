import type { DiagnosticQuestion, Level } from '../navigation/types';

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'd1',
    tag: 'Subject-Verb Agreement',
    prompt: 'Which sentence is correct?',
    options: [
      'He go to the office every morning.',
      'He goes to the office every morning.',
      'He going to the office every morning.',
    ],
    answerIndex: 1,
  },
  {
    id: 'd2',
    tag: 'Verb Tense',
    prompt: 'Which sentence is correct?',
    options: [
      'I have finished the report yesterday.',
      'I finished the report yesterday.',
      'I finish the report yesterday.',
    ],
    answerIndex: 1,
  },
  {
    id: 'd3',
    tag: 'Articles',
    prompt: 'Which sentence is correct?',
    options: [
      'She is engineer at large company.',
      'She is an engineer at a large company.',
      'She is the engineer at large company.',
    ],
    answerIndex: 1,
  },
  {
    id: 'd4',
    tag: 'Prepositions',
    prompt: 'Which sentence is correct?',
    options: [
      'We discussed about the new plan.',
      'We discussed the new plan.',
      'We discussed on the new plan.',
    ],
    answerIndex: 1,
  },
  {
    id: 'd5',
    tag: 'Conditionals',
    prompt: 'Which sentence is correct?',
    options: [
      'If I would know the answer, I would tell you.',
      'If I knew the answer, I would tell you.',
      'If I know the answer, I would tell you.',
    ],
    answerIndex: 1,
  },
  {
    id: 'd6',
    tag: 'Comparatives',
    prompt: 'Which sentence is correct?',
    options: [
      'This approach is more better for our team.',
      'This approach is better for our team.',
      'This approach is more good for our team.',
    ],
    answerIndex: 1,
  },
];

export type DiagnosticScore = {
  correctCount: number;
  totalCount: number;
  level: Level;
  weakAreas: string[];
};

export function scoreDiagnostic(
  answers: Record<string, number>,
): DiagnosticScore {
  let correctCount = 0;
  const weakAreas: string[] = [];
  for (const question of DIAGNOSTIC_QUESTIONS) {
    if (answers[question.id] === question.answerIndex) {
      correctCount += 1;
    } else {
      weakAreas.push(question.tag);
    }
  }
  const totalCount = DIAGNOSTIC_QUESTIONS.length;
  let level: Level = 'A2';
  if (correctCount >= 5) {
    level = 'C1';
  } else if (correctCount >= 3) {
    level = 'B2';
  } else if (correctCount >= 2) {
    level = 'B1';
  }
  return { correctCount, totalCount, level, weakAreas };
}
