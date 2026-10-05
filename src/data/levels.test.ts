import { describe, expect, it } from 'vitest';
import { DEFAULT_FLAGS, StateManager, type SceneId } from '@/core/StateManager';
import {
  LEVELS,
  clearedFlagKey,
  selectedFlagKey,
} from './levels';

describe('levels registry', () => {
  it('registers every level scene on StateManager', () => {
    const states = new StateManager();
    const registered = new Set<SceneId>();

    for (const level of LEVELS) {
      states.register(level.scene, {
        enter() {
          registered.add(level.scene);
        },
      });
      states.boot(level.scene, { era: level.era, fadeSeconds: 0 });
    }

    expect(LEVELS.map((l) => l.scene)).toEqual([...registered]);
  });

  it('has cleared/selected flags in DEFAULT_FLAGS for each level', () => {
    for (const level of LEVELS) {
      const cleared = clearedFlagKey(level.id);
      const selected = selectedFlagKey(level.id);
      expect(cleared in DEFAULT_FLAGS).toBe(true);
      expect(selected in DEFAULT_FLAGS).toBe(true);
      expect(typeof DEFAULT_FLAGS[cleared as keyof typeof DEFAULT_FLAGS]).toBe(
        'boolean',
      );
      expect(typeof DEFAULT_FLAGS[selected as keyof typeof DEFAULT_FLAGS]).toBe(
        'boolean',
      );
    }
  });
});
