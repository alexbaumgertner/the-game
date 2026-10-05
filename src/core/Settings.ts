/**
 * Player preferences — localStorage `novgorod1995:settings`.
 * Versioned + try/catch so private mode / quota never breaks the game.
 */

export const SETTINGS_KEY = 'novgorod1995:settings';
export const SETTINGS_VERSION = 1;

export type DialogTextSize = 'normal' | 'large';
export type DialogSpeed = 'slow' | 'normal' | 'fast';

export interface GameSettings {
  version: typeof SETTINGS_VERSION;
  /** No shake / flicker / harsh flashes; softer beer desaturation. */
  reducedEffects: boolean;
  dialogTextSize: DialogTextSize;
  dialogSpeed: DialogSpeed;
}

export const DEFAULT_SETTINGS: GameSettings = {
  version: SETTINGS_VERSION,
  reducedEffects: false,
  dialogTextSize: 'normal',
  dialogSpeed: 'normal',
};

/** Typewriter chars/sec — `normal` matches the pre-settings DialogueSystem. */
export const DIALOG_SPEED_CPS: Record<DialogSpeed, number> = {
  slow: 28,
  normal: 48,
  fast: 90,
};

type SettingsListener = (settings: GameSettings) => void;

let cached: GameSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<SettingsListener>();

function isDialogTextSize(v: unknown): v is DialogTextSize {
  return v === 'normal' || v === 'large';
}

function isDialogSpeed(v: unknown): v is DialogSpeed {
  return v === 'slow' || v === 'normal' || v === 'fast';
}

function parseSettings(raw: unknown): GameSettings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== SETTINGS_VERSION) return null;

  return {
    version: SETTINGS_VERSION,
    reducedEffects: typeof obj.reducedEffects === 'boolean' ? obj.reducedEffects : false,
    dialogTextSize: isDialogTextSize(obj.dialogTextSize) ? obj.dialogTextSize : 'normal',
    dialogSpeed: isDialogSpeed(obj.dialogSpeed) ? obj.dialogSpeed : 'normal',
  };
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      cached = { ...DEFAULT_SETTINGS };
      return getSettings();
    }
    const parsed = parseSettings(JSON.parse(raw) as unknown);
    cached = parsed ?? { ...DEFAULT_SETTINGS };
    return getSettings();
  } catch {
    cached = { ...DEFAULT_SETTINGS };
    return getSettings();
  }
}

export function getSettings(): GameSettings {
  return { ...cached };
}

export function writeSettings(partial: Partial<Omit<GameSettings, 'version'>>): GameSettings {
  cached = {
    ...cached,
    ...partial,
    version: SETTINGS_VERSION,
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cached));
  } catch {
    /* storage unavailable — keep in-memory preferences for the session */
  }
  const snapshot = getSettings();
  for (const listener of listeners) listener(snapshot);
  return snapshot;
}

export function subscribeSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Soft stamina fail — HUD strip + overlay (never «Конец игры»). */
export const SOFT_FAIL_HUD = 'ПЕРЕДЫШКА…';
export const SOFT_FAIL_TITLE = 'Передышка…';
export const SOFT_FAIL_SUB = 'Назад в 2026';
/** Neutral cream — not the old red `#f08080`. */
export const SOFT_FAIL_COLOR = '#d8d0c0';

/** Camera shake amplitude — zero when «Меньше эффектов». */
export function effectShake(amount: number): number {
  return getSettings().reducedEffects ? 0 : amount;
}

export function reducedEffectsOn(): boolean {
  return getSettings().reducedEffects;
}
