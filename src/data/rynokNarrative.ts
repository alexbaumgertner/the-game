/**
 * Level 1 Рынок — narrative dialogue scripts (no combat).
 * Help mom → take sister → buy backpack ≤600 → keys → bus to парк 30-летия Октября.
 */

import type { DialogueScript } from '@/systems/DialogueSystem';
import { HERO_NAME } from '@/data/names';

export const STARTING_RUBLES = 600;

/** Mom at МЕХА — take sister and find backpack. */
export const MOM_START_SCRIPT: DialogueScript = {
  id: 'mom_start',
  start: 'hello',
  lines: {
    hello: {
      speaker: 'Мама',
      text: `${HERO_NAME}, помоги с лотком. Куртки сами не продадутся — а сестрёнку возьми с собой.`,
      next: 'task',
    },
    task: {
      speaker: 'Мама',
      text: 'Ей нужен школьный рюкзак. У тебя шестьсот рублей — не больше. И чтобы ей понравился!',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Что скажешь?',
      choices: [
        { id: 'take_sister', label: 'Пойдём, сестрёнка.', effect: 'calm_mother', next: 'go' },
        { id: 'ask', label: 'А ключи от дома?', effect: 'none', next: 'keys_later' },
      ],
    },
    keys_later: {
      speaker: 'Мама',
      text: 'Ключи дам, когда рюкзак купите. Сначала рынок — потом домой на автобусе.',
      next: 'go',
    },
    go: {
      speaker: 'Сестрёнка',
      text: 'Ура! Пойдём смотреть рюкзаки!',
      next: null,
    },
  },
};

/** Seller A — too expensive. */
export const SELLER_A_SCRIPT: DialogueScript = {
  id: 'seller_a',
  start: 'pitch',
  lines: {
    pitch: {
      speaker: 'Продавец',
      text: 'Рюкзак «Орлёнок» — тысяча двести. Немецкая молния. Бери, пацан.',
      next: 'sis',
    },
    sis: {
      speaker: 'Сестрёнка',
      text: 'Дорого… и цвет какой-то грустный.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: '1200 ₽ при бюджете 600.',
      choices: [
        { id: 'leave', label: 'Дорого. Пойдём дальше.', effect: 'none', next: 'bye' },
        { id: 'haggle', label: 'Скинь до шестисот?', effect: 'none', next: 'no' },
      ],
    },
    no: {
      speaker: 'Продавец',
      text: 'С ума сошёл? Меньше тысячи не отдам.',
      next: 'bye',
    },
    bye: {
      speaker: 'Сестрёнка',
      text: 'Ищем другой. Мне этот не нравится.',
      next: null,
    },
  },
};

/** Seller B — still over budget / sister rejects. */
export const SELLER_B_SCRIPT: DialogueScript = {
  id: 'seller_b',
  start: 'pitch',
  lines: {
    pitch: {
      speaker: 'Тётя',
      text: 'Рюкзачок на школу — восемьсот. Почти новый, смотри карманы.',
      next: 'sis',
    },
    sis: {
      speaker: 'Сестрёнка',
      text: 'Карманы хорошие… но лямки жмут. И восемьсот много.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: '800 ₽ — всё ещё выше шестисот.',
      choices: [
        { id: 'leave', label: 'Спасибо, нам не подходит.', effect: 'none', next: 'bye' },
        { id: 'haggle', label: 'Может, за 600?', effect: 'none', next: 'no' },
      ],
    },
    no: {
      speaker: 'Тётя',
      text: 'Ниже семисот пятьдесят — ни-ни. Иди к овощам, там дешевле врут.',
      next: 'bye',
    },
    bye: {
      speaker: 'Сестрёнка',
      text: 'Пойдём к овощному лотку — вдруг там есть.',
      next: null,
    },
  },
};

/** Seller C — 550, sister likes → buy. */
export const SELLER_C_SCRIPT: DialogueScript = {
  id: 'seller_c',
  start: 'pitch',
  lines: {
    pitch: {
      speaker: 'Дядя',
      text: 'Школьный рюкзак — пятьсот пятьдесят. Крепкий, на два класса хватит.',
      next: 'sis',
    },
    sis: {
      speaker: 'Сестрёнка',
      text: 'О! Синий — как небо. И кармашек для пенала. Этот хочу!',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: '550 ₽ — влезает в 600. Берём?',
      choices: [
        { id: 'buy', label: 'Берём. Вот деньги.', effect: 'calm_goods', next: 'sold' },
        { id: 'think', label: 'Ещё посмотрим…', effect: 'none', next: 'sis_push' },
      ],
    },
    sis_push: {
      speaker: 'Сестрёнка',
      text: `${HERO_NAME}, пожалуйста! Этот самый хороший.`,
      next: 'choice2',
    },
    choice2: {
      speaker: 'Зуич',
      text: 'Сестрёнка просит.',
      choices: [
        { id: 'buy', label: 'Ладно, берём.', effect: 'calm_goods', next: 'sold' },
        { id: 'leave', label: 'Потом вернёмся.', effect: 'none', next: null },
      ],
    },
    sold: {
      speaker: 'Дядя',
      text: 'Стой. На рынке без ума не торгуют — ответь на вопрос, тогда рюкзак твой.',
      next: null,
    },
    sis_happy: {
      speaker: 'Сестрёнка',
      text: 'Спасибо! Побежали к маме — покажем!',
      next: null,
    },
  },
};

/** Return to mom — keys. */
export const MOM_RETURN_SCRIPT: DialogueScript = {
  id: 'mom_return',
  start: 'show',
  lines: {
    show: {
      speaker: 'Сестрёнка',
      text: 'Мам! Смотри какой рюкзак!',
      next: 'mom',
    },
    mom: {
      speaker: 'Мама',
      text: 'Молодцы. Ключи от дома — вот. На автобусе до парка Тридцатилетия Октября, дом рядом.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Какой автобус?',
      choices: [
        { id: 'keys', label: 'Понял. Идём на остановку.', effect: 'calm_mother', next: 'go' },
        { id: 'ask', label: 'Где расписание?', effect: 'none', next: 'hint' },
      ],
    },
    hint: {
      speaker: 'Мама',
      text: 'На остановке у синего стекла — табличка. Или спроси у людей. Не перепутай маршрут!',
      next: 'go',
    },
    go: {
      speaker: 'Мама',
      text: 'Целую. Я пока лоток стерегу.',
      next: null,
    },
  },
};

/** Bus stop — ask person. */
export const BUS_ASK_SCRIPT: DialogueScript = {
  id: 'bus_ask',
  start: 'ask',
  lines: {
    ask: {
      speaker: 'Зуич',
      text: 'Дяденька, как до парка Тридцатилетия Октября?',
      next: 'ans',
    },
    ans: {
      speaker: 'Прохожий',
      text: 'Автобус семь — через мост Александра Невского. Не садись на двенадцатый: тот на вокзал.',
      next: 'sis',
    },
    sis: {
      speaker: 'Сестрёнка',
      text: 'Семёрка! Запомнили?',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Маршрут ясен.',
      choices: [
        { id: 'got_it', label: 'Семёрка через мост. Спасибо!', effect: 'calm_bridge', next: null },
        { id: 'again', label: 'Ещё раз — какой номер?', effect: 'none', next: 'ans' },
      ],
    },
  },
};

/** Board the correct (or wrong) bus. */
export const BUS_BOARD_SCRIPT: DialogueScript = {
  id: 'bus_board',
  start: 'which',
  lines: {
    which: {
      speaker: 'Кондуктор',
      text: 'Куда, пацаны? Семёрка — мост, парк Тридцатилетия. Двенадцатый — вокзал.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Какой автобус?',
      choices: [
        { id: 'bus7', label: 'Семёрка — к парку.', effect: 'calm_bridge', next: 'ok' },
        { id: 'bus12', label: 'Двенадцатый.', effect: 'wrong_reassure', next: 'wrong' },
      ],
    },
    ok: {
      speaker: 'Кондуктор',
      text: 'Заходите. Через мост будет Кремль и София — смотрите в окна.',
      next: null,
    },
    wrong: {
      speaker: 'Сестрёнка',
      text: `${HERO_NAME}, нам не на вокзал! Мама сказала — парк!`,
      next: 'choice',
    },
  },
};
