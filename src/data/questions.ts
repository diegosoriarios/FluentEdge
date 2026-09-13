export type DailyQuestion = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type DailyQuestionRecord = DailyQuestion & {
  chosenIndex: number | null;
  answeredAt: number | null;
  viewedAt: number | null;
};

export const DAILY_QUESTIONS: DailyQuestion[] = [
  {
    id: 'q_present_perfect_since',
    question: 'I ___ here since 2019.',
    options: ['am living', 'have lived', 'live'],
    answerIndex: 1,
    explanation:
      'The present perfect describes a situation that started in the past and continues now. Use it with "since" plus a point in time.',
  },
  {
    id: 'q_past_simple_yesterday',
    question: 'She ___ the report yesterday.',
    options: ['has finished', 'finished', 'finishes'],
    answerIndex: 1,
    explanation:
      'A finished time expression like "yesterday" requires the past simple, not the present perfect.',
  },
  {
    id: 'q_articles_engineer',
    question: 'My sister is ___ engineer at ___ large company.',
    options: ['an / a', 'the / a', 'an / the'],
    answerIndex: 0,
    explanation:
      'First mentions of countable singular nouns take "a" or "an" (by sound: an engineer, a large company).',
  },
  {
    id: 'q_discuss_preposition',
    question: 'Which sentence is correct?',
    options: [
      'We discussed about the plan.',
      'We discussed the plan.',
      'We discussed on the plan.',
    ],
    answerIndex: 1,
    explanation: '"Discuss" is transitive — it takes a direct object with no preposition.',
  },
  {
    id: 'q_conditional_second',
    question: 'If I ___ the answer, I would tell you.',
    options: ['would know', 'knew', 'know'],
    answerIndex: 1,
    explanation:
      'Second conditional: if + past simple, would + base verb. "Would" does not appear in the if-clause.',
  },
  {
    id: 'q_comparative_double',
    question: 'This approach is ___ for our team.',
    options: ['more better', 'better', 'most good'],
    answerIndex: 1,
    explanation: '"Better" is already comparative — never combine it with "more".',
  },
  {
    id: 'q_passive_voice',
    question: 'The email ___ this morning.',
    options: ['was sent', 'was send', 'is sending'],
    answerIndex: 0,
    explanation:
      'Passive voice = be + past participle. Past passive: "was sent".',
  },
  {
    id: 'q_gerund_enjoy',
    question: 'I really ___ in the mountains.',
    options: ['enjoy to hike', 'enjoy hiking', 'enjoy hike'],
    answerIndex: 1,
    explanation: '"Enjoy" is always followed by the -ing form, never "to + verb".',
  },
  {
    id: 'q_modal_past',
    question: 'He ___ to the meeting, but he was sick.',
    options: ["should go", "should have gone", 'must go'],
    answerIndex: 1,
    explanation:
      'Past unreal advice uses "should have + past participle" for something that did not happen.',
  },
  {
    id: 'q_question_word_order',
    question: 'Which question is correct?',
    options: [
      'Where you are going?',
      'Where are you going?',
      'Where you going?',
    ],
    answerIndex: 1,
    explanation:
      'Questions invert the subject and auxiliary: question word + auxiliary + subject + verb.',
  },
  {
    id: 'q_for_since_duration',
    question: 'We have worked together ___ ten years.',
    options: ['since', 'for', 'during'],
    answerIndex: 1,
    explanation: '"For" is used with a duration (ten years); "since" with a starting point (2015).',
  },
  {
    id: 'q_much_many',
    question: 'There isn\'t ___ information about it.',
    options: ['many', 'much', 'a few'],
    answerIndex: 1,
    explanation:
      '"Much" is used with uncountable nouns like information; "many" with countable plurals.',
  },
  {
    id: 'q_apostrophe_possessive',
    question: 'That is ___ desk.',
    options: ["my brother's", 'my brothers', 'my brothers\''],
    answerIndex: 0,
    explanation:
      "Singular possessive adds apostrophe + s: brother's. One brother owns the desk.",
  },
  {
    id: 'q_conjunction_contrast',
    question: 'She was tired, ___ she finished the essay.',
    options: ['so', 'but', 'because'],
    answerIndex: 1,
    explanation:
      '"But" expresses contrast between the tiredness and finishing. "So" shows result, "because" shows cause.',
  },
  {
    id: 'q_neither_either',
    question: 'I don\'t like loud music. — ___.',
    options: ['So do I', 'Neither do I', 'Either do I'],
    answerIndex: 1,
    explanation:
      'To agree with a negative statement, use "Neither do I" (or "Nor do I").',
  },
];
