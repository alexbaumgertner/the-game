/**
 * Compatibility shim — school curriculum banks replaced by philosophy.
 * Prefer importing from `@/data/philosophyQuestions`.
 */

export {
  type PhilosophyEra,
  type QuizSubject,
  type QuizQuestion,
  type SchoolQuestion,
  MARKET_QUESTIONS,
  PEDAGOGY_QUESTIONS,
  GENERAL_PHILOSOPHY_QUESTIONS,
  PHILOSOPHY_QUESTIONS,
  SCHOOL_QUESTIONS,
  countByEra,
  shuffleQuestion,
  nextPhilosophyQuestion,
  nextMarketQuestion,
  nextSchoolQuestion,
} from '@/data/philosophyQuestions';
