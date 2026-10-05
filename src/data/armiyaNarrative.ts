/**
 * Level 9 «Армия, 2010» — satire of obedience vs initiative.
 * No real units, hazing, or insults. Bio details → TODO(owner).
 */

import type { DialogueScript } from '@/systems/DialogueSystem';

export const ARMY_ROUND_SECONDS = 25;
export const ARMY_ROUNDS = 3;

export type ArmyTaskId = 'paint_grass' | 'sweep_square' | 'dig_fill';

export interface ArmyTask {
  id: ArmyTaskId;
  title: string;
  prompt: string;
  /** Hold interact to fill progress; release decays. */
  holdFillPerSec: number;
  decayPerSec: number;
  sparkDrainPerSec: number;
}

export const ARMY_TASKS: readonly ArmyTask[] = [
  {
    id: 'paint_grass',
    title: 'Покрась траву',
    prompt: 'Держи E — крась зелёное в зелёное',
    holdFillPerSec: 0.22,
    decayPerSec: 0.12,
    sparkDrainPerSec: 0.045,
  },
  {
    id: 'sweep_square',
    title: 'Подмети чистую площадь',
    prompt: 'Держи E — мети туда-сюда',
    holdFillPerSec: 0.2,
    decayPerSec: 0.14,
    sparkDrainPerSec: 0.05,
  },
  {
    id: 'dig_fill',
    title: 'Выкопай и закопай',
    prompt: 'Держи E — яма / холм',
    holdFillPerSec: 0.18,
    decayPerSec: 0.1,
    sparkDrainPerSec: 0.055,
  },
];

/** Quiet-spark micro-acts while sergeant looks away (second button / punch). */
export const QUIET_SPARK_ACTS = [
  { label: 'Поправить ремень по-своему', spark: 0.12, thought: 'Хоть что-то — моё.' },
  { label: 'Взглянуть на небо', spark: 0.1, thought: 'Там ещё есть воздух.' },
  { label: 'Тихо напеть строку', spark: 0.11, thought: 'Не всё по уставу.' },
] as const;

export const CAUGHT_LINES = [
  'Сержант: Глаза есть? Руки — по уставу!',
  'Сержант: Инициатива без приказа — это фантазия. Стоять!',
  'Сержант: Красиво думаешь? Думать потом. Сейчас — кисть!',
] as const;

export const ROUND_FAIL_LINE = 'Искра погасла. Ещё раз — с начала круга.';

export const NIGHT_CHOICES = [
  {
    id: 'read',
    label: 'Прочитать страницу',
    line: 'Строчка чужая — а тепло своё.',
  },
  {
    id: 'write',
    label: 'Записать мысль',
    line: 'На полях устава — чужая буква. Моя.',
  },
  {
    id: 'stars',
    label: 'Считать звёзды',
    line: 'Семь… или восемь. Неважно. Я считал.',
  },
] as const;

/** Closing amoral / living spark phrase (not a sermon). */
export const ARMY_CLOSING_PHRASE =
  'Приказ кончился. Искра — нет. Она просто тише.';

export const INTRO_SCRIPT: DialogueScript = {
  id: 'armiya_intro',
  start: 'wake',
  lines: {
    wake: {
      speaker: 'Зуич',
      text: '2010. Плац. Холодно. TODO(owner): часть / город — без номеров.',
      next: 'sarge',
    },
    sarge: {
      speaker: 'Сержант',
      text: 'Строй! Сегодня учимся не думать. Кто думает — мешает строю.',
      next: 'hint',
    },
    hint: {
      speaker: 'Зуич',
      text: 'E — выполнять. Когда отвернулся — J: тихая искра. Esc — в квартиру.',
      next: null,
    },
  },
};
