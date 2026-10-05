/**
 * Shared settings key for mute and future options.
 * Readers must tolerate unknown / missing fields.
 */

export const SETTINGS_KEY = 'novgorod1995:settings';

export interface GameSettings {
  /** When true, all synthesis is silent. */
  muted?: boolean;
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const obj = parsed as Record<string, unknown>;
    const out: GameSettings = {};
    if (typeof obj.muted === 'boolean') out.muted = obj.muted;
    return out;
  } catch {
    return {};
  }
}

/** Merge patch into existing settings without dropping unknown keys. */
export function saveSettings(patch: GameSettings): void {
  try {
    let existing: Record<string, unknown> = {};
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        existing = { ...(parsed as Record<string, unknown>) };
      }
    }
    if (patch.muted !== undefined) existing.muted = patch.muted;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(existing));
  } catch {
    // localStorage may be unavailable — ignore
  }
}
