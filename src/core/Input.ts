/**
 * Lightweight keyboard state for Phase 2 scenes.
 * Arrow / WASD move · E / Enter interact · Escape / P pause (handled in main).
 */

export type InputAction = 'left' | 'right' | 'up' | 'down' | 'interact' | 'confirm';

const BINDINGS: Record<InputAction, readonly string[]> = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  interact: ['KeyE'],
  confirm: ['Enter'],
};

export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private enabled = true;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearAll);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearAll);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    // Keep physically-held keys in `down` so walk resumes after a fade without
    // requiring a fresh keydown. Only clear edge buffers.
    if (!value) {
      this.pressed.clear();
      this.released.clear();
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Held this frame. */
  isDown(action: InputAction): boolean {
    if (!this.enabled) return false;
    return BINDINGS[action].some((code) => this.down.has(code));
  }

  /** Edge: just pressed this frame (consume after poll via endFrame). */
  justPressed(action: InputAction): boolean {
    if (!this.enabled) return false;
    return BINDINGS[action].some((code) => this.pressed.has(code));
  }

  /** Horizontal axis: -1 left, +1 right, 0 none (right wins if both). */
  axisX(): number {
    const l = this.isDown('left');
    const r = this.isDown('right');
    if (l && !r) return -1;
    if (r && !l) return 1;
    return 0;
  }

  /** Call once at end of update to clear edge buffers. */
  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    // Prevent arrow-key page scroll while playing
    if (
      e.code.startsWith('Arrow') ||
      e.code === 'Space' ||
      e.code === 'KeyE' ||
      e.code === 'Enter'
    ) {
      e.preventDefault();
    }
    this.down.add(e.code);
    this.pressed.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
    this.released.add(e.code);
  };

  private readonly clearAll = (): void => {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
  };
}
