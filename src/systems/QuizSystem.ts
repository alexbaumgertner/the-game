/**
 * School quiz modal — 4 answers, paid hint, MF drain on wrong/hint.
 * Replaces punch/kick combat as the primary NPC interaction.
 */

import { drawUiText, drawUiTextCentered, measureUiText, uiPanel } from '@/art/uiFont';
import { GANGSTER_PUNCH_MF } from '@/systems/CombatMath';
import { nextSchoolQuestion } from '@/data/schoolQuestions';

/** Same absolute MF as one gangster punch (`Gangster.consumeAttackHit`). */
export const QUIZ_MF_COST = GANGSTER_PUNCH_MF; // 14

export type QuizAnswerResult = 'correct' | 'wrong' | 'ignored';

export class QuizSystem {
  private speaker = '';
  private question = '';
  private subject = '';
  private answers: [string, string, string, string] = ['', '', '', ''];
  private correctIndex: 0 | 1 | 2 | 3 = 0;
  private hintClue = '';
  private eliminated = new Set<number>();
  private hintUsed = false;
  private hintClueShown = false;
  private feedback = '';
  private feedbackTimer = 0;
  private openFlag = false;
  private closing = false;
  private closeTimer = 0;
  private onCorrect: (() => void) | null = null;

  get isOpen(): boolean {
    return this.openFlag;
  }

  get hintAvailable(): boolean {
    return this.openFlag && !this.hintUsed && !this.closing;
  }

  get answerLabels(): [string, string, string, string] | null {
    if (!this.openFlag) return null;
    return this.answers;
  }

  get eliminatedIndices(): ReadonlySet<number> {
    return this.eliminated;
  }

  open(speaker: string, onCorrect?: () => void): void {
    const q = nextSchoolQuestion();
    this.speaker = speaker;
    this.question = q.question;
    this.subject = q.subject;
    this.answers = q.answers;
    this.correctIndex = q.correctIndex;
    this.hintClue = q.hintClue;
    this.eliminated = new Set();
    this.hintUsed = false;
    this.hintClueShown = false;
    this.feedback = '';
    this.feedbackTimer = 0;
    this.openFlag = true;
    this.closing = false;
    this.closeTimer = 0;
    this.onCorrect = onCorrect ?? null;
  }

  closeSilent(): void {
    this.openFlag = false;
    this.closing = false;
    this.onCorrect = null;
    this.feedback = '';
    this.feedbackTimer = 0;
  }

  /** Pick answer 0–3. */
  selectAnswer(index: number): QuizAnswerResult {
    if (!this.openFlag || this.closing) return 'ignored';
    if (index < 0 || index > 3) return 'ignored';
    if (this.eliminated.has(index)) return 'ignored';
    if (this.feedbackTimer > 0 && !this.closing) return 'ignored';

    if (index === this.correctIndex) {
      this.feedback = 'ВЕРНО!';
      this.feedbackTimer = 0.55;
      this.closing = true;
      this.closeTimer = 0.55;
      return 'correct';
    }

    this.feedback = `НЕВЕРНО (−${QUIZ_MF_COST} СД)`;
    this.feedbackTimer = 0.65;
    this.eliminated.add(index);
    return 'wrong';
  }

  /**
   * Paid hint: eliminate one wrong option + short subject clue.
   * Costs QUIZ_MF_COST (same as a gangster punch). Returns true if applied.
   */
  takeHint(): boolean {
    if (!this.openFlag || this.closing || this.hintUsed) return false;
    if (this.feedbackTimer > 0) return false;

    const wrong = [0, 1, 2, 3].filter(
      (i) => i !== this.correctIndex && !this.eliminated.has(i),
    );
    if (wrong.length === 0) return false;

    const pick = wrong[Math.floor(Math.random() * wrong.length)]!;
    this.eliminated.add(pick);
    this.hintUsed = true;
    this.hintClueShown = true;
    this.feedback = `ПОДСКАЗКА (−${QUIZ_MF_COST} СД)`;
    this.feedbackTimer = 0.8;
    return true;
  }

  update(dt: number): void {
    if (!this.openFlag) return;
    if (this.feedbackTimer > 0) this.feedbackTimer -= dt;
    if (this.closing) {
      this.closeTimer -= dt;
      if (this.closeTimer <= 0) {
        const cb = this.onCorrect;
        this.openFlag = false;
        this.closing = false;
        this.onCorrect = null;
        cb?.();
      }
    }
  }

  hitTest(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
  ): number | 'hint' | null {
    if (!this.openFlag || this.closing) return null;
    const layout = this.layout(canvasWidth, canvasHeight);
    if (x < layout.boxX || x > layout.boxX + layout.boxW) return null;
    if (y < layout.boxY || y > layout.boxY + layout.boxH) return null;

    for (let i = 0; i < 4; i++) {
      const row = layout.answerY + i * layout.rowH;
      if (y >= row && y < row + layout.rowH - 2) {
        if (this.eliminated.has(i)) return null;
        return i;
      }
    }
    if (
      y >= layout.hintY &&
      y <= layout.hintY + 12 &&
      x >= layout.boxX + 6 &&
      x <= layout.boxX + 120
    ) {
      return 'hint';
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.openFlag) return;
    const L = this.layout(canvasWidth, canvasHeight);

    ctx.fillStyle = 'rgba(4, 6, 12, 0.55)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    uiPanel(
      ctx,
      L.boxX,
      L.boxY,
      L.boxW,
      L.boxH,
      'rgba(10, 12, 20, 0.94)',
      'rgba(200, 168, 80, 0.85)',
    );

    drawUiText(ctx, this.speaker, L.boxX + 6, L.boxY + 5, '#e8c56a', 7.5, 650);
    const sub = this.subject.toUpperCase();
    drawUiText(
      ctx,
      sub,
      L.boxX + L.boxW - measureUiText(ctx, sub, 6.5, 600) - 8,
      L.boxY + 6,
      '#80c0e0',
      6.5,
      600,
    );

    this.drawWrapped(ctx, this.question, L.boxX + 6, L.boxY + 18, L.boxW - 12, '#f0ece0', 7.5);

    if (this.hintClueShown) {
      drawUiText(ctx, this.hintClue, L.boxX + 6, L.boxY + 40, '#a0d8a0', 6.5, 500);
    }

    for (let i = 0; i < 4; i++) {
      const cy = L.answerY + i * L.rowH;
      const gone = this.eliminated.has(i);
      const bg = gone ? 'rgba(28,24,32,0.7)' : 'rgba(28,32,48,0.92)';
      const border = gone ? 'rgba(80,70,60,0.5)' : 'rgba(232,197,106,0.75)';
      uiPanel(ctx, L.boxX + 5, cy, L.boxW - 10, L.rowH - 3, bg, border);
      const keyCol = gone ? '#605848' : '#f8f0d0';
      const txtCol = gone ? '#605848' : '#e8e4d8';
      drawUiText(ctx, String(i + 1), L.boxX + 10, cy + 3, keyCol, 8, 700);
      const fitted = this.fit(ctx, this.answers[i]!, L.boxW - 28, 7, 550);
      drawUiText(ctx, fitted, L.boxX + 22, cy + 3.5, txtCol, 7, 550);
    }

    const hintLabel = this.hintUsed
      ? 'Подсказка использована'
      : `H — подсказка (−${QUIZ_MF_COST} СД)`;
    drawUiText(
      ctx,
      hintLabel,
      L.boxX + 6,
      L.hintY,
      this.hintUsed ? '#605848' : '#c0a060',
      6.5,
      550,
    );
    drawUiText(ctx, '1–4 ответ', L.boxX + L.boxW - 52, L.hintY, '#887848', 6.5, 500);

    if (this.feedback && this.feedbackTimer > 0) {
      const tw = measureUiText(ctx, this.feedback, 8, 700) + 16;
      const ok = this.feedback.startsWith('ВЕРНО');
      uiPanel(
        ctx,
        Math.round((canvasWidth - tw) / 2),
        L.boxY - 16,
        tw,
        13,
        'rgba(24,12,16,0.92)',
        ok ? 'rgba(64,200,120,0.8)' : 'rgba(224,96,64,0.8)',
      );
      drawUiTextCentered(
        ctx,
        this.feedback,
        canvasWidth / 2,
        L.boxY - 13,
        ok ? '#a0f0c0' : '#f0c0a0',
        8,
        700,
      );
    }
  }

  private layout(canvasWidth: number, canvasHeight: number) {
    const boxW = canvasWidth - 8;
    const boxH = 132;
    const boxX = 4;
    const boxY = canvasHeight - boxH - 4;
    const answerY = boxY + 52;
    const rowH = 14;
    const hintY = boxY + boxH - 12;
    return { boxX, boxY, boxW, boxH, answerY, rowH, hintY };
  }

  private drawWrapped(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    color: string,
    size: number,
  ): void {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    let lines = 0;
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (measureUiText(ctx, trial, size, 500) > maxW && line) {
        drawUiText(ctx, line, x, yy, color, size, 500);
        line = w;
        yy += 10;
        lines += 1;
        if (lines >= 2) break;
      } else {
        line = trial;
      }
    }
    if (line && lines < 2) drawUiText(ctx, line, x, yy, color, size, 500);
  }

  private fit(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxW: number,
    size: number,
    weight: number,
  ): string {
    if (measureUiText(ctx, text, size, weight) <= maxW) return text;
    let t = text;
    while (t.length > 1 && measureUiText(ctx, `${t}…`, size, weight) > maxW) {
      t = t.slice(0, -1);
    }
    return `${t}…`;
  }
}

export function quizHudHint(): string {
  return `1–4 ответ · H подсказка (−${QUIZ_MF_COST} СД) · E спросить`;
}
