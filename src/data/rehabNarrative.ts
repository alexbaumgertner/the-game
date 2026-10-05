/**
 * Level 10 «Распорядок» (2015) — voluntary structure; spark grows from choices.
 * Zuich came voluntarily; skeptical but respectful. Details → TODO(owner).
 */

import type { DialogueScript } from '@/systems/DialogueSystem';

export const REHAB_DAYS = 3;

export type DaySlot = 'morning' | 'day' | 'evening';

export interface RehabAction {
  id: string;
  label: string;
  spark: number;
  vignette: DialogueScript;
}

const v = (
  id: string,
  lines: { speaker: string; text: string }[],
): DialogueScript => {
  const map: DialogueScript['lines'] = {};
  lines.forEach((ln, i) => {
    const key = i === 0 ? 'start' : `n${i}`;
    const next = i + 1 < lines.length ? (i + 1 === 1 ? 'n1' : `n${i + 1}`) : null;
    // fix next keys
    map[key] = {
      speaker: ln.speaker,
      text: ln.text,
      next: i + 1 < lines.length ? (i === 0 ? 'n1' : `n${i + 1}`) : null,
    };
    void next;
  });
  // rebuild properly
  const keys = lines.map((_, i) => (i === 0 ? 'start' : `n${i}`));
  const rebuilt: DialogueScript['lines'] = {};
  lines.forEach((ln, i) => {
    rebuilt[keys[i]!] = {
      speaker: ln.speaker,
      text: ln.text,
      next: i + 1 < lines.length ? keys[i + 1]! : null,
    };
  });
  return { id, start: 'start', lines: rebuilt };
};

export const REHAB_ACTIONS: readonly RehabAction[] = [
  {
    id: 'group',
    label: 'Собрание группы',
    spark: 0.14,
    vignette: v('rehab_group', [
      { speaker: 'Ведущий', text: 'Кто хочет сказать — скажет. Кто нет — тоже здесь.' },
      { speaker: 'Зуич', text: 'Слушаю.' },
    ]),
  },
  {
    id: 'walk',
    label: 'Прогулка',
    spark: 0.12,
    vignette: v('rehab_walk', [
      { speaker: 'Зуич', text: 'Двор. Шаги без приказа. Странно привыкать.' },
      { speaker: 'Зуич', text: 'Иду. Воздух.' },
    ]),
  },
  {
    id: 'duty',
    label: 'Дежурство',
    spark: 0.1,
    vignette: v('rehab_duty', [
      { speaker: 'Зуич', text: 'Пол. Тряпка. Не геройство — просто сделано.' },
    ]),
  },
  {
    id: 'read',
    label: 'Чтение',
    spark: 0.13,
    vignette: v('rehab_read', [
      { speaker: 'Зуич', text: 'Страница. Не устава.' },
    ]),
  },
  {
    id: 'call',
    label: 'Звонок семье',
    spark: 0.15,
    vignette: v('rehab_call', [
      { speaker: 'Зуич', text: 'Гудки. Голос. Коротко и по делу.' },
    ]),
  },
  {
    id: 'silence',
    label: 'Тишина',
    spark: 0.11,
    vignette: v('rehab_silence', [
      { speaker: 'Зуич', text: 'Ничего не делать — тоже выбор. Сижу.' },
    ]),
  },
];

export const SLOT_LABEL: Record<DaySlot, string> = {
  morning: 'Утро',
  day: 'День',
  evening: 'Вечер',
};

export const REHAB_INTRO: DialogueScript = {
  id: 'rehab_intro',
  start: 'in',
  lines: {
    in: {
      speaker: 'Зуич',
      text: 'Я пришёл сам. Не верю в лозунги. Но распорядок — не приказ.',
      next: 'board',
    },
    board: {
      speaker: 'Зуич',
      text: 'Доска дня. Выбери одно на утро, день и вечер. Искра растёт от выбора.',
      next: null,
    },
  },
};
