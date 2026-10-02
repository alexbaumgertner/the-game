/**
 * DialogueSystem — modal overlays, typewriter, timed choice branches.
 * Phase 4: father-stall mid-fight choices that drain MF or calm panic.
 */

import { drawNesText, measureNesText } from '@/art/nesFont';
import { segaBox } from '@/art/pixelDraw';

export type DialogueEffect = 'calm_father' | 'wrong_reassure' | 'none';

export interface DialogueChoice {
  id: string;
  /** Short label drawn next to 1/2 key. */
  label: string;
  effect?: DialogueEffect;
  /** Next line id, or null/omit to close after choice. */
  next?: string | null;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  /** Next line id when no choices; null closes. */
  next?: string | null;
  choices?: DialogueChoice[];
  /** Seconds to pick; only used when choices present. */
  choiceTimeLimit?: number;
  /** Index auto-selected on timeout (default: last choice = wrong). */
  timeoutChoiceIndex?: number;
}

export interface DialogueScript {
  id: string;
  lines: Record<string, DialogueLine>;
  start: string;
}

export type DialogueCloseCallback = (
  scriptId: string,
  result: { effect: DialogueEffect; choiceId: string | null; timedOut: boolean },
) => void;

export class DialogueSystem {
  private active: DialogueScript | null = null;
  private lineId: string | null = null;
  private onClose: DialogueCloseCallback | null = null;
  private visibleChars = 0;
  private revealSpeed = 48; // chars per second
  private choiceTimer = 0;
  private choiceLimit = 0;
  private lastEffect: DialogueEffect = 'none';
  private lastChoiceId: string | null = null;
  private timedOut = false;
  private settled = false;

  get isOpen(): boolean {
    return this.active !== null;
  }

  get currentLine(): DialogueLine | null {
    if (!this.active || !this.lineId) return null;
    return this.active.lines[this.lineId] ?? null;
  }

  get hasChoices(): boolean {
    const line = this.currentLine;
    return !!line?.choices && line.choices.length > 0 && this.revealComplete;
  }

  get revealComplete(): boolean {
    const line = this.currentLine;
    if (!line) return false;
    return this.visibleChars >= line.text.length;
  }

  get choiceSecondsLeft(): number {
    return this.choiceTimer;
  }

  /** Begin a script. Closes any previous dialogue first. */
  open(script: DialogueScript, onClose?: DialogueCloseCallback): void {
    this.active = script;
    this.lineId = script.start;
    this.visibleChars = 0;
    this.onClose = onClose ?? null;
    this.lastEffect = 'none';
    this.lastChoiceId = null;
    this.timedOut = false;
    this.settled = false;
    this.armChoiceTimer();
  }

  close(): void {
    if (this.settled || !this.active) {
      this.active = null;
      this.lineId = null;
      this.visibleChars = 0;
      this.onClose = null;
      return;
    }
    this.settled = true;
    const id = this.active.id;
    const result = {
      effect: this.lastEffect,
      choiceId: this.lastChoiceId,
      timedOut: this.timedOut,
    };
    this.active = null;
    this.lineId = null;
    this.visibleChars = 0;
    const cb = this.onClose;
    this.onClose = null;
    cb?.(id, result);
  }

  /** Clear without firing onClose (scene enter / exit). */
  resetSilent(): void {
    this.active = null;
    this.lineId = null;
    this.visibleChars = 0;
    this.onClose = null;
    this.choiceTimer = 0;
    this.choiceLimit = 0;
    this.lastEffect = 'none';
    this.lastChoiceId = null;
    this.timedOut = false;
    this.settled = false;
  }

  /** Advance typewriter or non-choice lines. */
  advance(): void {
    const line = this.currentLine;
    if (!line || !this.active) return;

    if (this.visibleChars < line.text.length) {
      this.visibleChars = line.text.length;
      this.armChoiceTimer();
      return;
    }

    if (line.choices && line.choices.length > 0) {
      // Waiting for numbered choice / timeout
      return;
    }

    if (line.next == null || line.next === '') {
      this.close();
      return;
    }
    this.lineId = line.next;
    this.visibleChars = 0;
    this.armChoiceTimer();
  }

  /** Pick choice by 0-based index (keys 1/2 → 0/1). */
  selectChoice(index: number): boolean {
    const line = this.currentLine;
    if (!line?.choices || !this.revealComplete) return false;
    const choice = line.choices[index];
    if (!choice) return false;
    return this.applyChoice(choice, false);
  }

  update(dt: number): void {
    const line = this.currentLine;
    if (!line) return;

    if (this.visibleChars < line.text.length) {
      this.visibleChars = Math.min(
        line.text.length,
        this.visibleChars + this.revealSpeed * dt,
      );
      if (this.visibleChars >= line.text.length) this.armChoiceTimer();
      return;
    }

    if (line.choices && line.choices.length > 0 && this.choiceLimit > 0) {
      this.choiceTimer -= dt;
      if (this.choiceTimer <= 0) {
        const idx =
          line.timeoutChoiceIndex ??
          Math.max(0, line.choices.length - 1);
        const choice = line.choices[idx];
        if (choice) this.applyChoice(choice, true);
      }
    }
  }

  /** Timed choice overlay at bottom of internal resolution. */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const line = this.currentLine;
    if (!line) return;

    const hasChoices = !!(line.choices && line.choices.length > 0);
    const boxH = hasChoices && this.revealComplete ? 78 : 44;
    const pad = 4;
    const y = canvasHeight - boxH - pad;

    ctx.fillStyle = 'rgba(6, 8, 14, 0.94)';
    ctx.fillRect(pad, y, canvasWidth - pad * 2, boxH);
    ctx.strokeStyle = '#e8c56a';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, y + 0.5, canvasWidth - pad * 2 - 1, boxH - 1);
    // Inner chrome
    ctx.strokeStyle = '#604820';
    ctx.strokeRect(pad + 2.5, y + 2.5, canvasWidth - pad * 2 - 5, boxH - 5);

    drawNesText(ctx, line.speaker.toUpperCase(), pad + 6, y + 8, '#e8c56a', 1, 1);

    const shown = line.text.slice(0, Math.floor(this.visibleChars));
    this.drawWrapped(ctx, shown, pad + 6, y + 20, canvasWidth - pad * 2 - 12, '#e8e4d8');

    if (!this.revealComplete) {
      drawNesText(ctx, 'Z/ENTER', canvasWidth - 52, y + boxH - 10, '#887848', 1, 1);
      return;
    }

    if (hasChoices && line.choices) {
      // Timer bar
      if (this.choiceLimit > 0) {
        const barW = canvasWidth - pad * 2 - 12;
        const pct = Math.max(0, this.choiceTimer / this.choiceLimit);
        ctx.fillStyle = '#1a1420';
        ctx.fillRect(pad + 6, y + 34, barW, 4);
        ctx.fillStyle = pct < 0.33 ? '#e04040' : pct < 0.6 ? '#f0c040' : '#40c878';
        ctx.fillRect(pad + 6, y + 34, Math.round(barW * pct), 4);
        const sec = Math.ceil(Math.max(0, this.choiceTimer));
        drawNesText(ctx, `${sec}S`, pad + 6 + barW - 16, y + 34, '#f0e8c8', 1, 1);
      }

      line.choices.forEach((c, i) => {
        const cy = y + 44 + i * 12;
        const key = String(i + 1);
        segaBox(ctx, pad + 6, cy - 2, 12, 10, '#201828', '#e8c56a', { inset: false });
        drawNesText(ctx, key, pad + 9, cy, '#f8f0d0', 1, 1);
        drawNesText(ctx, c.label.toUpperCase(), pad + 22, cy, '#d8d0c0', 1, 1);
      });
    } else {
      drawNesText(ctx, 'Z/ENTER', canvasWidth - 52, y + boxH - 10, '#887848', 1, 1);
    }
  }

  private applyChoice(choice: DialogueChoice, timedOut: boolean): boolean {
    this.lastEffect = choice.effect ?? 'none';
    this.lastChoiceId = choice.id;
    this.timedOut = timedOut;

    if (choice.next == null || choice.next === '') {
      this.close();
      return true;
    }
    this.lineId = choice.next;
    this.visibleChars = 0;
    this.armChoiceTimer();
    return true;
  }

  private armChoiceTimer(): void {
    const line = this.currentLine;
    if (line?.choices && line.choices.length > 0 && this.revealComplete) {
      this.choiceLimit = line.choiceTimeLimit ?? 6;
      this.choiceTimer = this.choiceLimit;
    } else {
      this.choiceLimit = 0;
      this.choiceTimer = 0;
    }
  }

  private drawWrapped(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    color: string,
  ): void {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (measureNesText(trial, 1, 1) > maxW && line) {
        drawNesText(ctx, line, x, yy, color, 1, 1);
        line = w;
        yy += 9;
      } else {
        line = trial;
      }
    }
    if (line) drawNesText(ctx, line, x, yy, color, 1, 1);
  }
}

/** Level 1 father-stall script — timed reassurance branch. */
export const FATHER_STALL_SCRIPT: DialogueScript = {
  id: 'father_stall_midfight',
  start: 'intro',
  lines: {
    intro: {
      speaker: 'Father',
      text: 'They took your mother coat! I freeze - what do I do?',
      next: 'choice',
    },
    choice: {
      speaker: 'Father',
      text: 'Son - talk to me. Quick!',
      choiceTimeLimit: 7,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'steady',
          label: 'Steady. I got this.',
          effect: 'calm_father',
          next: 'calm_ok',
        },
        {
          id: 'empty',
          label: 'It will be fine...',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    calm_ok: {
      speaker: 'Father',
      text: 'Da. Eyes sharp. Get the coat - I hold the stall.',
      next: null,
    },
    panic_worse: {
      speaker: 'Father',
      text: 'Empty words! They come back harder - MOVE!',
      next: null,
    },
  },
};

/** Debug helper so TypeScript callers can assert portrait-free overlay. */
export function dialogueChoiceHint(): string {
  return '1 / 2 choose · Z advance · timer auto-picks';
}
