/**
 * Level 2 — выпускной / разговор с отцом + квиз «почему такой выбор».
 */

import type { DialogueScript } from '@/systems/DialogueSystem';
import type { SchoolQuestion } from '@/data/schoolQuestions';

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
      text: 'Саша. Школа кончилась. Куда дальше? Не «потом разберёмся» — скажи сейчас.',
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
      text: 'Хорошо. Теперь докажи себе: ответь честно на вопросы — зачем ты так решил.',
      next: null,
    },
  },
};

/** Why-that-choice quiz bank (life/school reasoning), 1 correct + 3 wrong. */
export const GRADUATION_QUESTIONS: SchoolQuestion[] = [
  {
    id: 'grad-why-path',
    subject: 'литература',
    grade: 11,
    question: 'Почему ты сказал отцу про «свой путь», а не «как получится»?',
    answers: [
      'Потому что выбор — это ответственность, не отговорка',
      'Чтобы быстрее закончить разговор',
      'Потому что так сказали одноклассники',
      'Чтобы не получать домашку',
    ],
    correctIndex: 0,
    hintClue: 'Дело не в красивых словах — в том, что ты берёшь на себя решение.',
  },
  {
    id: 'grad-school',
    subject: 'история',
    grade: 11,
    question: 'Что из школы ты хочешь унести дальше всего?',
    answers: [
      'Умение учиться и держать слово',
      'Только оценки в аттестате',
      'Сплетни выпускного',
      'Право больше ничего не делать',
    ],
    correctIndex: 0,
    hintClue: 'Аттестат важен, но привычка учиться важнее одной цифры.',
  },
  {
    id: 'grad-family',
    subject: 'русский',
    grade: 11,
    question: 'Как честно говорить с отцом о будущем?',
    answers: [
      'Прямо: что хочешь и чего боишься',
      'Молчать, пока не спросят',
      'Обещать всё подряд',
      'Свалить вину на учителей',
    ],
    correctIndex: 0,
    hintClue: 'Правда короче отговорки — и её слышат.',
  },
  {
    id: 'grad-next',
    subject: 'география',
    grade: 11,
    question: 'Что значит «дальше» после школы в Новгороде 1995?',
    answers: [
      'Шаг, который выбираешь сам — учёба, дело, путь',
      'Только уехать любой ценой',
      'Ждать, пока решат за тебя',
      'Забыть всё, что было',
    ],
    correctIndex: 0,
    hintClue: '«Дальше» — глагол действия, не ожидания.',
  },
];
