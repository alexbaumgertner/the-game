/**
 * SaveGame — localStorage persistence for progress flags + tea cups.
 * Every storage / JSON access is guarded: Safari private mode, blocked
 * storage or corrupt data must never break the game.
 *
 * v1 → v2: beer.cans → tea.cups; new level9–12 flags default false.
 */

import { DEFAULT_FLAGS, type ProgressFlags } from './StateManager';

export const SAVE_KEY = 'novgorod1995:save';
export const SAVE_VERSION = 2;

export interface SaveData {
  version: 2;
  flags: ProgressFlags;
  tea: { cups: number };
}

export interface SaveSource {
  flags: Readonly<ProgressFlags>;
  tea: { cups: number };
}

function parseFlags(rawFlags: unknown): ProgressFlags {
  const flags = { ...DEFAULT_FLAGS };
  if (typeof rawFlags !== 'object' || rawFlags === null) return flags;
  for (const key of Object.keys(DEFAULT_FLAGS) as (keyof ProgressFlags)[]) {
    const v = (rawFlags as Record<string, unknown>)[key];
    if (typeof v === 'boolean') flags[key] = v;
  }
  return flags;
}

function parseCupsFromV1Beer(obj: Record<string, unknown>): number {
  const rawBeer = obj.beer;
  const rawCans =
    typeof rawBeer === 'object' && rawBeer !== null
      ? (rawBeer as Record<string, unknown>).cans
      : 0;
  if (typeof rawCans === 'number' && Number.isFinite(rawCans)) {
    return Math.max(0, Math.floor(rawCans));
  }
  return 0;
}

function parseCupsFromV2Tea(obj: Record<string, unknown>): number {
  const rawTea = obj.tea;
  const rawCups =
    typeof rawTea === 'object' && rawTea !== null
      ? (rawTea as Record<string, unknown>).cups
      : undefined;
  if (typeof rawCups === 'number' && Number.isFinite(rawCups)) {
    return Math.max(0, Math.floor(rawCups));
  }
  // Fallback if a v2 save somehow still has beer.cans
  return parseCupsFromV1Beer(obj);
}

/** Returns a validated save, or null when missing / corrupt / unknown version. */
export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    const version = obj.version;

    if (version === 1) {
      const flags = parseFlags(obj.flags);
      const cups = parseCupsFromV1Beer(obj);
      return { version: SAVE_VERSION, flags, tea: { cups } };
    }

    if (version !== SAVE_VERSION) return null;

    const flags = parseFlags(obj.flags);
    const cups = parseCupsFromV2Tea(obj);
    return { version: SAVE_VERSION, flags, tea: { cups } };
  } catch {
    return null;
  }
}

export function writeSave(state: SaveSource): void {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      flags: { ...state.flags },
      tea: { cups: state.tea.cups },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable or full — progress just isn't persisted */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
