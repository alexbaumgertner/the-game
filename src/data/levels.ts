/**
 * Level registry — single source for diary, year strip, and scene wiring.
 * Years for levels 10–11 are editable here only.
 * Each entry's `scene` must be registerable; cleared/selected flags must exist
 * in `DEFAULT_FLAGS`.
 */

import type { GameEra, SceneId } from '@/core/StateManager';

/** Editable year for mid-timeline levels (10–11). */
export const MID_TIMELINE_YEAR = 2015;

export interface LevelMeta {
  id: number;
  scene: SceneId;
  /** Calendar year, or null for the framing «сейчас». */
  year: number | null;
  title: string;
  era: GameEra;
  /** Short diary subtitle when unlocked. */
  subtitle: string;
}

export const LEVELS: readonly LevelMeta[] = [
  {
    id: 1,
    scene: 'rynok_1995',
    year: 1995,
    title: 'Рынок · рюкзак',
    era: 'ERA_1995',
    subtitle: 'Сестрёнка · автобус',
  },
  {
    id: 2,
    scene: 'podezd_1995',
    year: 1995,
    title: 'Выпускной',
    era: 'ERA_1995',
    subtitle: 'Разговор с отцом',
  },
  {
    id: 3,
    scene: 'vokzal_1995',
    year: 1995,
    title: 'Вокзал',
    era: 'ERA_1995',
    subtitle: 'Зима 1995',
  },
  {
    id: 4,
    scene: 'garazhi_1995',
    year: 1995,
    title: 'Гаражи',
    era: 'ERA_1995',
    subtitle: 'Зима 1995',
  },
  {
    id: 5,
    scene: 'dvor_1995',
    year: 1995,
    title: 'Двор / крыша',
    era: 'ERA_1995',
    subtitle: 'Финал блока',
  },
  {
    id: 6,
    scene: 'most_1995',
    year: 1995,
    title: 'Мост / Волхов',
    era: 'ERA_1995',
    subtitle: 'Зима 1995',
  },
  {
    id: 7,
    scene: 'diskoteka_1995',
    year: 1995,
    title: 'Дискотека «Орбита»',
    era: 'ERA_1995',
    subtitle: 'Зима 1995',
  },
  {
    id: 8,
    scene: 'detinets_1995',
    year: 1995,
    title: 'Детинец',
    era: 'ERA_1995',
    subtitle: 'Финал зимы',
  },
  {
    id: 9,
    scene: 'armiya_2010',
    year: 2010,
    title: 'Армия',
    era: 'ERA_2010',
    subtitle: 'Приказ и искра',
  },
  {
    id: 10,
    scene: 'rehab_2015',
    year: MID_TIMELINE_YEAR,
    title: 'Распорядок',
    era: 'ERA_2015',
    subtitle: 'День за днём',
  },
  {
    id: 11,
    scene: 'krug_2015',
    year: MID_TIMELINE_YEAR,
    title: 'Круг',
    era: 'ERA_2015',
    subtitle: 'Шаги',
  },
  {
    id: 12,
    scene: 'finale_2026',
    year: null,
    title: 'Финал',
    era: 'ERA_2026',
    subtitle: 'Сейчас',
  },
] as const;

/** Year-strip anchors shown above the diary list. */
export const YEAR_STRIP: readonly { label: string; yearKey: string }[] = [
  { label: '1995', yearKey: '1995' },
  { label: String(MID_TIMELINE_YEAR), yearKey: String(MID_TIMELINE_YEAR) },
  { label: 'сейчас', yearKey: 'сейчас' },
];

export function levelYearKey(level: LevelMeta): string {
  if (level.year === null) return 'сейчас';
  return String(level.year);
}

export function getLevel(id: number): LevelMeta | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function clearedFlagKey(id: number): `level${number}Cleared` {
  return `level${id}Cleared` as `level${number}Cleared`;
}

export function selectedFlagKey(id: number): `level${number}Selected` {
  return `level${id}Selected` as `level${number}Selected`;
}
