import type { Goal, Profile } from '../navigation/types';

export const GOAL_LABELS: Record<Goal, string> = {
  business: 'Business',
  academic: 'Academic',
  exam: 'Exam prep (IELTS/TOEFL)',
  casual: 'Casual / conversational',
  creative: 'Creative writing',
};

export const FOCUS_AREA_LABELS: Record<string, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  tone: 'Tone & style',
  fluency: 'Fluency',
};

const PROMPTS_BY_GOAL: Record<Goal, string[]> = {
  business: [
    'Write a short email to a colleague apologizing for missing a meeting and proposing a new time.',
    'Write a brief message to your manager summarizing progress on a project and flagging one risk.',
    'Write a polite reply declining a meeting invitation because of a scheduling conflict.',
  ],
  academic: [
    'Write a paragraph arguing for or against remote learning, including one counterargument.',
    'Summarize in a few sentences why reliable sources matter in academic writing.',
    'Describe a research topic that interests you and one question you would investigate.',
  ],
  exam: [
    'Some people prefer to work for a large company; others prefer a small one. Write your opinion with reasons.',
    'Describe a skill you would like to learn and explain how you plan to learn it.',
    'Write about a memorable trip you took and what made it special.',
  ],
  casual: [
    'Describe your typical morning routine in a few sentences.',
    'Write a short message to a friend suggesting plans for the weekend.',
    'Write about the last movie or series you enjoyed and why you would recommend it.',
  ],
  creative: [
    'Write the opening paragraph of a story that begins with an unexpected letter.',
    'Describe a city street as if it were a character with a personality.',
    'Write a short scene where two characters disagree about something small but treat it as serious.',
  ],
};

const PROMPTS_BY_GOAL_ES: Record<Goal, string[]> = {
  business: [
    'Escribe un correo corto a un compañero para disculparte por perder una reunión y proponer una nueva hora.',
    'Escribe un mensaje breve a tu jefe resumiendo el avance de un proyecto y mencionando un riesgo.',
    'Escribe una respuesta educada rechazando una invitación a una reunión por un conflicto de horario.',
  ],
  academic: [
    'Escribe un párrafo a favor o en contra del aprendizaje en línea, incluyendo un contraargumento.',
    'Resume en pocas frases por qué las fuentes confiables son importantes en la escritura académica.',
    'Describe un tema de investigación que te interese y una pregunta que te gustaría investigar.',
  ],
  exam: [
    'Algunas personas prefieren trabajar en una empresa grande; otras, en una pequeña. Escribe tu opinión con razones.',
    'Describe una habilidad que te gustaría aprender y explica cómo planeas hacerlo.',
    'Escribe sobre un viaje memorable que hiciste y qué lo hizo especial.',
  ],
  casual: [
    'Describe tu rutina de la mañana en pocas frases.',
    'Escribe un mensaje corto a un amigo proponiendo planes para el fin de semana.',
    'Escribe sobre la última película o serie que disfrutaste y por qué la recomendarías.',
  ],
  creative: [
    'Escribe el párrafo inicial de una historia que comience con una carta inesperada.',
    'Describe una calle de tu ciudad como si fuera un personaje con personalidad.',
    'Escribe una escena breve donde dos personajes discuten algo pequeño pero lo tratan como algo serio.',
  ],
};

export function getPromptForProfile(profile: Profile): string {
  const pool =
    profile.targetLanguage === 'es'
      ? PROMPTS_BY_GOAL_ES[profile.goal]
      : PROMPTS_BY_GOAL[profile.goal];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
