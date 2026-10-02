/**
 * On-screen NES/Sega-style virtual pad for smartphone / touch play.
 * Maps into Input virtual actions so keyboard bindings stay intact on desktop.
 */

import type { Input, InputAction } from '@/core/Input';

export interface TouchControlsOptions {
  input: Input;
  root?: HTMLElement;
  /** Called when pause pad is tapped. */
  onPause?: () => void;
  /**
   * Optional: show dialogue choice strip when this returns true.
   * Labels are optional short strings for the two choices.
   */
  getDialogueChoices?: () =>
    | { active: boolean; labels?: [string, string] }
    | null
    | undefined;
}

function prefersTouchUi(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const hasTouch = navigator.maxTouchPoints > 0;
  return coarse || noHover || (hasTouch && narrow);
}

const HOLD_ACTIONS: ReadonlySet<InputAction> = new Set([
  'left',
  'right',
  'up',
  'down',
  'jump',
]);

export class TouchControls {
  private readonly input: Input;
  private readonly root: HTMLElement;
  private readonly onPause?: () => void;
  private readonly getDialogueChoices?: TouchControlsOptions['getDialogueChoices'];
  private readonly shell: HTMLDivElement;
  private readonly pad: HTMLDivElement;
  private readonly choiceBar: HTMLDivElement;
  private readonly toggleBtn: HTMLButtonElement;
  private visible: boolean;
  private forced = false;
  private readonly activePointers = new Map<number, InputAction>();
  private destroyed = false;
  private rafId: number | null = null;

  constructor(options: TouchControlsOptions) {
    this.input = options.input;
    this.root = options.root ?? document.body;
    this.onPause = options.onPause;
    this.getDialogueChoices = options.getDialogueChoices;
    this.visible = prefersTouchUi();

    this.shell = document.createElement('div');
    this.shell.id = 'touch-controls';
    this.shell.setAttribute('aria-hidden', this.visible ? 'false' : 'true');

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.type = 'button';
    this.toggleBtn.className = 'tc-toggle';
    this.toggleBtn.textContent = this.visible ? 'HIDE PAD' : 'SHOW PAD';
    this.toggleBtn.title = 'Toggle on-screen controls';
    this.toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.forced = true;
      this.setVisible(!this.visible);
    });

    this.pad = document.createElement('div');
    this.pad.className = 'tc-pad';
    this.pad.innerHTML = `
      <div class="tc-cluster tc-left">
        <button type="button" class="tc-btn tc-dir" data-action="left" aria-label="Move left">◀</button>
        <button type="button" class="tc-btn tc-dir" data-action="right" aria-label="Move right">▶</button>
        <button type="button" class="tc-btn tc-jump" data-action="jump" aria-label="Jump">JUMP</button>
      </div>
      <div class="tc-cluster tc-right">
        <button type="button" class="tc-btn tc-act" data-action="punch" aria-label="Punch">A<br><span>PUNCH</span></button>
        <button type="button" class="tc-btn tc-act" data-action="kick" aria-label="Kick">B<br><span>KICK</span></button>
        <button type="button" class="tc-btn tc-act tc-special" data-action="special" aria-label="Bazar">C<br><span>BAZAR</span></button>
        <button type="button" class="tc-btn tc-act tc-interact" data-action="interact" aria-label="Interact">E<br><span>USE</span></button>
      </div>
      <button type="button" class="tc-btn tc-pause" data-pause="1" aria-label="Pause">II</button>
    `;

    this.choiceBar = document.createElement('div');
    this.choiceBar.className = 'tc-choices';
    this.choiceBar.hidden = true;
    this.choiceBar.innerHTML = `
      <button type="button" class="tc-btn tc-choice" data-action="choice1" aria-label="Choice 1">
        <span class="tc-choice-key">1</span>
        <span class="tc-choice-label" data-choice-label="0">CHOICE 1</span>
      </button>
      <button type="button" class="tc-btn tc-choice" data-action="choice2" aria-label="Choice 2">
        <span class="tc-choice-key">2</span>
        <span class="tc-choice-label" data-choice-label="1">CHOICE 2</span>
      </button>
    `;

    this.shell.append(this.toggleBtn, this.choiceBar, this.pad);
    this.root.appendChild(this.shell);

    this.bindPad(this.pad);
    this.bindPad(this.choiceBar);
    this.applyVisibility();

    window.addEventListener('resize', this.onResize);
    this.rafId = requestAnimationFrame(this.tickChoices);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener('resize', this.onResize);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    for (const action of this.activePointers.values()) {
      this.input.setVirtual(action, false);
    }
    this.activePointers.clear();
    this.shell.remove();
  }

  setVisible(value: boolean): void {
    this.visible = value;
    this.applyVisibility();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  private readonly onResize = (): void => {
    if (this.forced) return;
    const next = prefersTouchUi();
    if (next !== this.visible) this.setVisible(next);
  };

  private applyVisibility(): void {
    this.shell.classList.toggle('tc-visible', this.visible);
    this.shell.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
    this.toggleBtn.textContent = this.visible ? 'HIDE PAD' : 'SHOW PAD';
    // Toggle stays discoverable even when pad is hidden (desktop opt-in).
    this.toggleBtn.classList.toggle('tc-toggle-alone', !this.visible);
  }

  private bindPad(container: HTMLElement): void {
    const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-action], button[data-pause]');
    for (const btn of buttons) {
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
      btn.addEventListener('pointerdown', (e) => this.onPointerDown(e, btn));
      btn.addEventListener('pointerup', (e) => this.onPointerUp(e));
      btn.addEventListener('pointercancel', (e) => this.onPointerUp(e));
      btn.addEventListener('pointerleave', (e) => {
        // Only release if this pointer was tracking on this button
        if (this.activePointers.has(e.pointerId)) this.onPointerUp(e);
      });
    }
  }

  private onPointerDown(e: PointerEvent, btn: HTMLButtonElement): void {
    e.preventDefault();
    e.stopPropagation();
    btn.setPointerCapture?.(e.pointerId);

    if (btn.dataset.pause === '1') {
      this.onPause?.();
      return;
    }

    const action = btn.dataset.action as InputAction | undefined;
    if (!action) return;

    if (HOLD_ACTIONS.has(action)) {
      this.activePointers.set(e.pointerId, action);
      this.input.setVirtual(action, true);
      btn.classList.add('tc-active');
    } else {
      // confirm also fires with interact for overlays that listen to either
      if (action === 'interact') {
        this.input.pulseVirtual('interact');
        this.input.pulseVirtual('confirm');
      } else {
        this.input.pulseVirtual(action);
      }
      btn.classList.add('tc-active');
      window.setTimeout(() => btn.classList.remove('tc-active'), 120);
    }
  }

  private onPointerUp(e: PointerEvent): void {
    e.preventDefault();
    const action = this.activePointers.get(e.pointerId);
    if (!action) return;
    this.activePointers.delete(e.pointerId);
    this.input.setVirtual(action, false);
    this.pad.querySelectorAll('.tc-active').forEach((el) => {
      const b = el as HTMLButtonElement;
      if (b.dataset.action === action) b.classList.remove('tc-active');
    });
  }

  private readonly tickChoices = (): void => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.tickChoices);
    const info = this.getDialogueChoices?.();
    const show = !!(this.visible && info?.active);
    this.choiceBar.hidden = !show;
    this.shell.classList.toggle('tc-dialogue', show);
    if (show && info?.labels) {
      const a = this.choiceBar.querySelector('[data-choice-label="0"]');
      const b = this.choiceBar.querySelector('[data-choice-label="1"]');
      if (a) a.textContent = info.labels[0]!.toUpperCase();
      if (b) b.textContent = info.labels[1]!.toUpperCase();
    }
  };
}

/** Inject once — NES/Sega chrome for the virtual pad. */
export function injectTouchControlStyles(): void {
  if (document.getElementById('touch-controls-style')) return;
  const style = document.createElement('style');
  style.id = 'touch-controls-style';
  style.textContent = `
#touch-controls {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  font-family: 'Courier New', Courier, monospace;
  --tc-safe-b: env(safe-area-inset-bottom, 0px);
  --tc-safe-l: env(safe-area-inset-left, 0px);
  --tc-safe-r: env(safe-area-inset-right, 0px);
  --tc-safe-t: env(safe-area-inset-top, 0px);
}
#touch-controls.tc-visible .tc-pad,
#touch-controls.tc-visible .tc-choices:not([hidden]) {
  opacity: 1;
  visibility: visible;
}
.tc-toggle {
  pointer-events: auto;
  position: absolute;
  top: calc(8px + var(--tc-safe-t));
  left: calc(8px + var(--tc-safe-l));
  z-index: 45;
  min-height: 36px;
  min-width: 84px;
  padding: 6px 10px;
  border: 2px solid #c8b060;
  background: rgba(18, 16, 28, 0.72);
  color: #f0e8c8;
  font: 700 11px/1 'Courier New', Courier, monospace;
  letter-spacing: 0.04em;
  border-radius: 4px;
  opacity: 0.55;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.tc-toggle:active,
.tc-toggle.tc-toggle-alone {
  opacity: 0.92;
}
.tc-pad {
  position: absolute;
  inset: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
}
.tc-cluster {
  pointer-events: auto;
  position: absolute;
  bottom: calc(12px + var(--tc-safe-b));
  display: grid;
  gap: 10px;
}
.tc-left {
  left: calc(10px + var(--tc-safe-l));
  grid-template-columns: 64px 64px;
  grid-template-rows: 56px 56px;
  grid-template-areas:
    "left right"
    "jump jump";
}
.tc-left .tc-btn[data-action="left"] { grid-area: left; }
.tc-left .tc-btn[data-action="right"] { grid-area: right; }
.tc-left .tc-btn[data-action="jump"] { grid-area: jump; }
.tc-right {
  right: calc(10px + var(--tc-safe-r));
  grid-template-columns: 64px 64px;
  grid-template-rows: 64px 64px;
  grid-template-areas:
    "punch kick"
    "special interact";
}
.tc-right .tc-btn[data-action="punch"] { grid-area: punch; }
.tc-right .tc-btn[data-action="kick"] { grid-area: kick; }
.tc-right .tc-btn[data-action="special"] { grid-area: special; }
.tc-right .tc-btn[data-action="interact"] { grid-area: interact; }
.tc-btn {
  pointer-events: auto;
  min-width: 56px;
  min-height: 56px;
  border: 2px solid #a89048;
  background: rgba(24, 20, 36, 0.58);
  color: #f4ecd0;
  font: 700 13px/1.1 'Courier New', Courier, monospace;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(80, 64, 32, 0.6);
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  text-transform: uppercase;
}
.tc-btn span {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  letter-spacing: 0.06em;
  opacity: 0.85;
}
.tc-btn.tc-active,
.tc-btn:active {
  background: rgba(232, 197, 106, 0.42);
  border-color: #f0d878;
  color: #fff8e0;
}
.tc-jump {
  font-size: 12px;
  letter-spacing: 0.08em;
}
.tc-special {
  border-color: #68a0d8;
}
.tc-interact {
  border-color: #70c878;
}
.tc-pause {
  pointer-events: auto;
  position: absolute;
  top: calc(8px + var(--tc-safe-t));
  right: calc(8px + var(--tc-safe-r));
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  opacity: 0.7;
  font-size: 14px;
  letter-spacing: 0.12em;
}
.tc-choices {
  pointer-events: auto;
  position: absolute;
  left: 50%;
  bottom: calc(148px + var(--tc-safe-b));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(420px, calc(100vw - 24px));
  z-index: 46;
  opacity: 0;
  visibility: hidden;
}
.tc-choice {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 8px 12px;
  text-align: left;
  background: rgba(10, 12, 22, 0.82);
  border-color: #e8c56a;
  border-radius: 6px;
}
.tc-choice-key {
  flex: 0 0 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8c56a;
  background: #201828;
  font-size: 14px;
}
.tc-choice-label {
  font-size: 12px;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#touch-controls.tc-dialogue .tc-right {
  opacity: 0.35;
}
@media (orientation: landscape) and (max-height: 500px) {
  .tc-cluster { bottom: calc(6px + var(--tc-safe-b)); gap: 6px; }
  .tc-left, .tc-right { transform: scale(0.88); transform-origin: bottom center; }
  .tc-choices { bottom: calc(110px + var(--tc-safe-b)); }
}
@media (min-width: 901px) and (hover: hover) and (pointer: fine) {
  .tc-toggle { opacity: 0.35; }
  .tc-toggle:hover { opacity: 0.9; }
}
`;
  document.head.appendChild(style);
}
