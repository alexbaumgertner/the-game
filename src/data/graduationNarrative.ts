/**
 * Level 2 — выпускной / разговор с отцом + квиз по педагогике.
 */

import type { DialogueScript } from '@/systems/DialogueSystem';
import {
  PEDAGOGY_QUESTIONS,
  type QuizQuestion,
} from '@/data/philosophyQuestions';

/** Walk memory → father hard talk. */
export const FATHER_TALK_SCRIPT: DialogueScript = {
  id: 'father_graduation',
  start: 'recall',
  lines: {
    recall: {
      speaker: 'Зуич',
      text: 'Выпускной. Класс гудит. А дома — разговор, от которого не уйти.',
      next: 'dad',
    },
    dad: {
      speaker: 'Отец',
      text: 'Сынок. Школа кончилась. Куда дальше? Не «потом разберёмся» — скажи сейчас.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Что ответить отцу?',
      choiceTimeLimit: 10,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'honest',
          label: 'Хочу попробовать свой путь.',
          effect: 'calm_father',
          next: 'ok',
        },
        {
          id: 'empty',
          label: 'Не знаю… как получится.',
          effect: 'wrong_reassure',
          next: 'push',
        },
      ],
    },
    push: {
      speaker: 'Отец',
      text: '«Как получится» — это не ответ. Подумай и объясни почему.',
      next: 'ok',
    },
    ok: {
      speaker: 'Отец',
      text: 'Хорошо. Теперь не отговорки — вопросы о том, как люди учатся и растут. Пиаже, Выготский… отвечай честно.',
      next: null,
    },
  },
};

/**
 * Father quest uses a focused pedagogy slice (full bank: PEDAGOGY_QUESTIONS).
 * Order: Piaget → Vygotsky → dialogue/experience theorists.
 */
export const GRADUATION_QUESTIONS: readonly QuizQuestion[] = [
  PEDAGOGY_QUESTIONS[0]!, // piaget-stages
  PEDAGOGY_QUESTIONS[1]!, // piaget-assim
  PEDAGOGY_QUESTIONS[3]!, // vygotsky-zpd
  PEDAGOGY_QUESTIONS[4]!, // vygotsky-social
  PEDAGOGY_QUESTIONS[6]!, // dewey-exp
  PEDAGOGY_QUESTIONS[9]!, // ped-dialogue
];
