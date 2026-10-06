import { afterEach, describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  loadSave,
  writeSave,
} from './SaveGame';
import { DEFAULT_FLAGS } from './StateManager';

afterEach(() => {
  clearSave();
});

describe('SaveGame.loadSave', () => {
  it('returns null for missing save', () => {
    expect(loadSave()).toBeNull();
  });

  it('returns null for bad JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not-json');
    expect(loadSave()).toBeNull();
  });

  it('returns null for unknown version', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 99,
        flags: DEFAULT_FLAGS,
        tea: { cups: 1 },
      }),
    );
    expect(loadSave()).toBeNull();
  });

  it('ignores extra keys and unknown flag names', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 2,
        flags: { introDone: true, notARealFlag: true },
        tea: { cups: 2 },
        bonus: 'ignore-me',
      }),
    );
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.version).toBe(SAVE_VERSION);
    expect(save!.flags.introDone).toBe(true);
    expect(save!.tea.cups).toBe(2);
    expect(
      Object.prototype.hasOwnProperty.call(save!.flags, 'notARealFlag'),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(save!, 'bonus')).toBe(false);
  });

  it('ignores non-boolean flag values', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 2,
        flags: { introDone: 'yes', seenPhoto: true, diaryUnlocked: 1 },
        tea: { cups: 0 },
      }),
    );
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.flags.introDone).toBe(false);
    expect(save!.flags.seenPhoto).toBe(true);
    expect(save!.flags.diaryUnlocked).toBe(false);
  });

  it('migrates v1 beer.cans to v2 tea.cups', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        flags: { introDone: true, level1Cleared: true },
        beer: { cans: 4 },
      }),
    );
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.version).toBe(2);
    expect(save!.tea.cups).toBe(4);
    expect(save!.flags.introDone).toBe(true);
    expect(save!.flags.level1Cleared).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(save!, 'beer')).toBe(false);
  });
});

describe('SaveGame.writeSave', () => {
  it('round-trips flags and tea cups', () => {
    writeSave({
      flags: { ...DEFAULT_FLAGS, diaryUnlocked: true },
      tea: { cups: 7 },
    });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.version).toBe(2);
    expect(save!.flags.diaryUnlocked).toBe(true);
    expect(save!.tea.cups).toBe(7);
  });
});
