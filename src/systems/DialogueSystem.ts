/**
 * DialogueSystem — modal text boxes + speaker portraits.
 *
 * TODO Phase 5:
 * - Script JSON: id → lines[{ speaker, text, next? }]
 * - Typewriter reveal + skip
 * - Choice branches that set StateManager flags
 * - Pause GameLoop simulation while dialogue is open
 */

export interface DialogueLine {
  speaker: string;
  text: string;
  /** Next line id, or null to close. */
  next?: string | null;
}

export interface DialogueScript {
  id: string;
  lines: Record<string, DialogueLine>;
  start: string;
}

export type DialogueCallback = (scriptId: string, closed: boolean) => void;

export class DialogueSystem {
  private active: DialogueScript | null = null;
  private lineId: string | null = null;
  private onClose: DialogueCallback | null = null;
  private visibleChars = 0;
  private revealSpeed = 40; // chars per second

  get isOpen(): boolean {
    return this.active !== null;
  }

  get currentLine(): DialogueLine | null {
    if (!this.active || !this.lineId) return null;
    return this.active.lines[this.lineId] ?? null;
  }

  /** Begin a script. Closes any previous dialogue first. */
  open(script: DialogueScript, onClose?: DialogueCallback): void {
    this.active = script;
    this.lineId = script.start;
    this.visibleChars = 0;
    this.onClose = onClose ?? null;
  }

  close(): void {
    const id = this.active?.id ?? '';
    this.active = null;
    this.lineId = null;
    this.visibleChars = 0;
    const cb = this.onClose;
    this.onClose = null;
    cb?.(id, true);
  }

  /** Advance to next line, or close if terminal. */
  advance(): void {
    const line = this.currentLine;
    if (!line || !this.active) return;

    const full = line.text;
    if (this.visibleChars < full.length) {
      // Skip typewriter — show full line first
      this.visibleChars = full.length;
      return;
    }

    if (line.next == null || line.next === '') {
      this.close();
      return;
    }
    this.lineId = line.next;
    this.visibleChars = 0;
  }

  update(dt: number): void {
    const line = this.currentLine;
    if (!line) return;
    this.visibleChars = Math.min(
      line.text.length,
      this.visibleChars + this.revealSpeed * dt,
    );
  }

  /** Placeholder box at bottom of the internal resolution. */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const line = this.currentLine;
    if (!line) return;

    const boxH = 40;
    const pad = 4;
    const y = canvasHeight - boxH - pad;

    ctx.fillStyle = 'rgba(10, 10, 12, 0.92)';
    ctx.fillRect(pad, y, canvasWidth - pad * 2, boxH);
    ctx.strokeStyle = '#e8c56a';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, y + 0.5, canvasWidth - pad * 2 - 1, boxH - 1);

    ctx.fillStyle = '#e8c56a';
    ctx.font = '6px monospace';
    ctx.fillText(line.speaker, pad + 4, y + 10);

    const shown = line.text.slice(0, Math.floor(this.visibleChars));
    ctx.fillStyle = '#e8e4d8';
    ctx.fillText(shown, pad + 4, y + 22);
  }
}
