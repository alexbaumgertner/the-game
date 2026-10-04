/**
 * SaveGame — localStorage persistence for progress flags + beer cans.
 * Every storage / JSON access is guarded: Safari private mode, blocked
 * storage or corrupt data must never break the game.
 */

import { DEFAULT_FLAGS, type ProgressFlags } from './StateManager';

export const SAVE_KEY = 'novgorod1995:save';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: 1;
  flags: ProgressFlags;
  beer: { cans: number };
}

export interface SaveSource {
  flags: Readonly<ProgressFlags>;
  beer: { cans: number };
}

/** Returns a validated save, or null when missing / corrupt / unknown version. */
export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.version !== SAVE_VERSION) return null;

    const rawFlags = obj.flags;
    if (typeof rawFlags !== 'object' || rawFlags === null) return null;
    const flags = { ...DEFAULT_FLAGS };
    for (const key of Object.keys(DEFAULT_FLAGS) as (keyof ProgressFlags)[]) {
      const v = (rawFlags as Record<string, unknown>)[key];
      if (typeof v === 'boolean') flags[key] = v;
    }

    const rawBeer = obj.beer;
    const rawCans =
      typeof rawBeer === 'object' && rawBeer !== null
        ? (rawBeer as Record<string, unknown>).cans
        : 0;
    const cans =
      typeof rawCans === 'number' && Number.isFinite(rawCans)
        ? Math.max(0, Math.floor(rawCans))
        : 0;

    return { version: SAVE_VERSION, flags, beer: { cans } };
  } catch {
    return null;
  }
}

export function writeSave(state: SaveSource): void {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      flags: { ...state.flags },
      beer: { cans: state.beer.cans },
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
