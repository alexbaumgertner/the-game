/**
 * Lightweight keyboard + virtual (touch) state for apartment + rynok combat.
 * Move · Jump · Punch · Kick · Bazar special · Interact · Confirm · Choices.
 */

export type InputAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'punch'
  | 'kick'
  | 'special'
  | 'interact'
  | 'confirm'
  | 'choice1'
  | 'choice2'
  /** Drink beer / «Применить бухло». */
  | 'beer';

const BINDINGS: Record<InputAction, readonly string[]> = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  punch: ['KeyJ', 'KeyZ'],
  kick: ['KeyK', 'KeyX'],
  special: ['KeyL', 'KeyC', 'KeyF'],
  interact: ['KeyE'],
  confirm: ['Enter'],
  choice1: ['Digit1', 'Numpad1'],
  choice2: ['Digit2', 'Numpad2'],
  beer: ['KeyB'],
};

export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  /** Touch / on-screen pad held actions. */
  private readonly virtualDown = new Set<InputAction>();
  /** Touch edge: just pressed this frame. */
  private readonly virtualPressed = new Set<InputAction>();
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
    // Keep physically-held keys / virtual holds in `down` so walk resumes after
    // a fade without requiring a fresh press. Only clear edge buffers.
    if (!value) {
      this.pressed.clear();
      this.released.clear();
      this.virtualPressed.clear();
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Drive an action from touch / virtual pad.
   * `down: true` on pointerdown (edge + hold); `false` on pointerup/cancel.
   */
  setVirtual(action: InputAction, down: boolean): void {
    if (down) {
      if (!this.virtualDown.has(action)) {
        this.virtualPressed.add(action);
      }
      this.virtualDown.add(action);
    } else {
      this.virtualDown.delete(action);
    }
  }

  /** Fire a one-frame virtual press (tap buttons that shouldn't hold). */
  pulseVirtual(action: InputAction): void {
    this.virtualPressed.add(action);
    this.virtualDown.add(action);
    // Release hold next frame via endFrame companion — callers that need
    // instant-only should use pulseVirtual and rely on endFrame clearing press,
    // then clearVirtualHold next tick. For simplicity we clear hold in endFrame
    // only for pulsed actions tracked separately.
    this.pulsed.add(action);
  }

  private readonly pulsed = new Set<InputAction>();

  /** Held this frame. */
  isDown(action: InputAction): boolean {
    if (!this.enabled) return false;
    if (this.virtualDown.has(action)) return true;
    return BINDINGS[action].some((code) => this.down.has(code));
  }

  /** Edge: just pressed this frame (consume after poll via endFrame). */
  justPressed(action: InputAction): boolean {
    if (!this.enabled) return false;
    if (this.virtualPressed.has(action)) return true;
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
    this.virtualPressed.clear();
    for (const action of this.pulsed) {
      this.virtualDown.delete(action);
    }
    this.pulsed.clear();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    // Prevent arrow-key page scroll / space scroll while playing
    if (
      e.code.startsWith('Arrow') ||
      e.code === 'Space' ||
      e.code === 'KeyE' ||
      e.code === 'Enter' ||
      e.code === 'KeyJ' ||
      e.code === 'KeyK' ||
      e.code === 'KeyL' ||
      e.code === 'KeyZ' ||
      e.code === 'KeyX' ||
      e.code === 'KeyC' ||
      e.code === 'KeyF' ||
      e.code === 'Digit1' ||
      e.code === 'Digit2' ||
      e.code === 'KeyB' ||
      e.code === 'KeyP' ||
      e.code === 'Escape'
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
    this.virtualDown.clear();
    this.virtualPressed.clear();
    this.pulsed.clear();
  };
}
