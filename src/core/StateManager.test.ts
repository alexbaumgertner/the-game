import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_FLAGS, StateManager } from './StateManager';

describe('StateManager.setFlag', () => {
  it('updates a flag and notifies onFlagsChanged', () => {
    const states = new StateManager();
    const spy = vi.fn();
    states.onFlagsChanged = spy;

    states.setFlag('introDone', true);

    expect(states.flags.introDone).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(states.flags);
  });

  it('does not notify when the value is unchanged', () => {
    const states = new StateManager();
    const spy = vi.fn();
    states.onFlagsChanged = spy;

    states.setFlag('introDone', false);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('StateManager.loadFlags', () => {
  it('applies known boolean flags without firing onFlagsChanged', () => {
    const states = new StateManager();
    const spy = vi.fn();
    states.onFlagsChanged = spy;

    states.loadFlags({
      introDone: true,
      seenPhoto: true,
      // @ts-expect-error intentional non-boolean — runtime must ignore
      diaryUnlocked: 'yes',
    });
    // Unknown keys are ignored at runtime (spread via Partial cast).
    states.loadFlags({ notARealFlag: true } as Partial<typeof DEFAULT_FLAGS>);

    expect(states.flags.introDone).toBe(true);
    expect(states.flags.seenPhoto).toBe(true);
    expect(states.flags.diaryUnlocked).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(states.flags, 'notARealFlag'),
    ).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(Object.keys(states.flags).sort()).toEqual(
      Object.keys(DEFAULT_FLAGS).sort(),
    );
  });
});
