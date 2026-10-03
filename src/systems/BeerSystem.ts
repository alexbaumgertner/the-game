/**
 * Beer thirst — ~2 minutes to full gray / freeze without a drink.
 * Lack starts immediately: colors desaturate on a smooth ramp and thirst
 * thoughts float above Зуич’s head. Drinking restores color + clears thoughts.
 * Disabled / paused during 1995 flashback levels (`pauseForFlashback`).
 */

import { drawUiText, measureUiText, uiPanel } from '@/art/uiFont';

/** Seconds from full color to freeze / full gray. */
export const BEER_THIRST_SECONDS = 120;

export const BEER_HINT_LONG =
  'БЕЗ ПИВА МИР СЕРЕЕТ — НАЙДИ БАНКУ И НАЖМИ B. ЧЕРЕЗ ~2 МИН ЗУИЧ ВСТАНЕТ.';

/** Internal monologue while thirsty (above head). */
export const CRISIS_LINES = [
  'Что со мной?',
  'Что происходит вокруг?',
  'Что с миром?',
  'Кто я?',
  'Почему так тяжело?',
  'Где моё пиво?',
  'Почему всё серое?',
  'Надо выпить…',
  'Голова гудит…',
  'Ещё одна банка…',
  'Без пива плохо…',
] as const;

const THOUGHT_TRAIL_MAX = 3;
/** Seconds between thought cycles (faster as thirst worsens). */
const THOUGHT_CYCLE_MAX = 2.6;
const THOUGHT_CYCLE_MIN = 1.5;
/** Lack above this starts floating thoughts (near-immediate). */
const THOUGHT_ONSET = 0.02;

export class BeerSystem {
  /** Seconds until freeze. */
  thirst = BEER_THIRST_SECONDS;
  /** Cans in inventory. */
  cans = 0;
  /** When false, timer does not tick (1995 flashbacks). */
  enabled = true;
  /** True until first successful drink — show long hint. */
  showLongHint = true;
  /** Newest crisis line (also last in thoughtTrail). */
  crisisLine: string | null = null;
  private crisisCooldown = 0;
  private crisisIndex = 0;
  /** Fading trail of recent thoughts for overhead мыслепоток. */
  private thoughtTrail: string[] = [];
  /** 0→1 progress through current thought cycle (for fade / float). */
  private thoughtPulse = 0;
  /** Accumulated time for bobbing animation. */
  private thoughtTime = 0;

  get isFrozen(): boolean {
    return this.enabled && this.thirst <= 0;
  }

  /** 1 = full (just drank), 0 = empty / frozen. */
  get thirstRatio(): number {
    return Math.max(0, Math.min(1, this.thirst / BEER_THIRST_SECONDS));
  }

  /**
   * Visual lack 0→1. Slight ease-in so desat is noticeable early,
   * while full gray still lands at ~2 minutes.
   */
  get lackAmount(): number {
    const t = 1 - this.thirstRatio;
    if (t <= 0) return 0;
    // Blend linear + sqrt so the first ~20–30s already feel washed.
    return Math.min(1, t * 0.55 + Math.sqrt(t) * 0.45);
  }

  resetForApartment(): void {
    this.enabled = true;
    if (this.thirst <= 0) this.thirst = Math.min(30, BEER_THIRST_SECONDS);
  }

  pauseForFlashback(): void {
    this.enabled = false;
    this.clearCrisis();
  }

  pickup(count = 1): void {
    this.cans += count;
  }

  /** Drink one can. Returns false if none left or not thirsty-enabled. */
  drink(): boolean {
    if (!this.enabled) return false;
    if (this.cans <= 0) return false;
    this.cans -= 1;
    this.thirst = BEER_THIRST_SECONDS;
    this.showLongHint = false;
    this.clearCrisis();
    return true;
  }

  update(dt: number): void {
    if (!this.enabled) return;

    this.thoughtTime += dt;

    if (this.thirst > 0) {
      this.thirst = Math.max(0, this.thirst - dt);
    }

    const lack = this.lackAmount;
    if (lack < THOUGHT_ONSET) {
      this.clearCrisis();
      return;
    }

    const cycle =
      THOUGHT_CYCLE_MAX - (THOUGHT_CYCLE_MAX - THOUGHT_CYCLE_MIN) * Math.min(1, lack);

    this.crisisCooldown -= dt;
    this.thoughtPulse = 1 - Math.max(0, this.crisisCooldown) / cycle;
    if (this.crisisCooldown <= 0) {
      this.pushThought(CRISIS_LINES[this.crisisIndex % CRISIS_LINES.length]!);
      this.crisisIndex += 1;
      this.crisisCooldown = cycle;
      this.thoughtPulse = 0;
    }
  }

  /**
   * Compact beer chrome under the top-right identity panel (no overlap).
   */
  renderHud(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (!this.enabled) return;

    // Sit below era+level panel
    const top = 26;

    if (this.showLongHint) {
      const line1 = 'B — применить бухло';
      const line2 = 'Без пива мир сереет';
      const tw = Math.max(measureUiText(ctx, line1, 6.5, 550), measureUiText(ctx, line2, 6.5, 500)) + 10;
      const bx = canvasWidth - tw - 2;
      uiPanel(ctx, bx, top, tw, 22, 'rgba(12,10,8,0.82)', 'rgba(200,160,72,0.7)');
      drawUiText(ctx, line1, bx + 5, top + 3, '#f0d878', 6.5, 550);
      drawUiText(ctx, line2, bx + 5, top + 12, '#c0b090', 6.5, 500);
      void BEER_HINT_LONG;
      return;
    }

    const bw = 48;
    const bx = canvasWidth - bw - 2;
    uiPanel(ctx, bx, top, bw, 16, 'rgba(12,10,8,0.82)', 'rgba(200,160,72,0.7)');
    ctx.fillStyle = '#d8a040';
    ctx.fillRect(bx + 5, top + 3, 5, 8);
    ctx.fillStyle = '#f0c868';
    ctx.fillRect(bx + 6, top + 4, 3, 2);
    ctx.fillStyle = '#808890';
    ctx.fillRect(bx + 6, top + 2, 3, 2);
    drawUiText(ctx, `×${this.cans}`, bx + 13, top + 3, '#f0e8c8', 7, 650);
    const barX = bx + 5;
    const barY = top + 12;
    const barW = bw - 10;
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(barX, barY, barW, 2);
    const fill = Math.round(this.thirstRatio * barW);
    ctx.fillStyle = this.thirstRatio <= 0.2 ? '#e04040' : '#e0a040';
    ctx.fillRect(barX, barY, fill, 2);
  }

  /**
   * Progressive desat + thoughts above the hero. Call after gameplay draw,
   * before beer HUD so chrome stays readable.
   */
  renderCrisis(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    playerX?: number,
    playerY?: number,
  ): void {
    if (!this.enabled) return;

    const lack = this.lackAmount;
    if (lack <= 0 && !this.isFrozen) return;

    this.renderDesaturation(ctx, canvasWidth, canvasHeight, lack);

    const headX = playerX ?? canvasWidth / 2;
    const headY = (playerY ?? canvasHeight * 0.65) - 48;
    this.renderOverheadThoughts(ctx, canvasWidth, headX, headY, lack);

    if (this.isFrozen) {
      const hint = 'B — применить бухло';
      const hintW = measureUiText(ctx, hint, 7, 600) + 16;
      const hx = Math.round((canvasWidth - hintW) / 2);
      const hy = canvasHeight - 36;
      uiPanel(ctx, hx, hy, hintW, 16, 'rgba(12,10,8,0.78)', 'rgba(180,160,100,0.55)');
      drawUiText(ctx, hint, hx + 8, hy + 4, '#e8d090', 7, 600);
    }
  }

  private renderDesaturation(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    lack: number,
  ): void {
    if (lack <= 0) return;

    // Progressive desaturate: alpha ramps with lack (smooth, not a slap).
    ctx.save();
    ctx.globalAlpha = Math.min(1, lack);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    // Cool gray wash strengthens toward freeze.
    const wash = 0.08 + 0.4 * lack;
    ctx.fillStyle = `rgba(36, 38, 46, ${wash.toFixed(3)})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private renderOverheadThoughts(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    headX: number,
    headY: number,
    lack: number,
  ): void {
    if (lack < THOUGHT_ONSET) return;

    const trail =
      this.thoughtTrail.length > 0
        ? this.thoughtTrail
        : this.crisisLine
          ? [this.crisisLine]
          : ['Где моё пиво?'];

    const intensity = Math.min(1, 0.35 + lack * 0.65);

    for (let i = 0; i < trail.length; i++) {
      const line = trail[i]!;
      const fromEnd = trail.length - 1 - i;
      const isNewest = fromEnd === 0;
      const bob =
        Math.sin(this.thoughtTime * (1.6 + fromEnd * 0.35) + fromEnd * 1.7) * (2.5 + fromEnd);
      const drift =
        Math.cos(this.thoughtTime * (0.9 + fromEnd * 0.2) + fromEnd) * (3 + fromEnd * 2);

      const alpha = isNewest
        ? (0.5 + 0.5 * Math.min(1, this.thoughtPulse + 0.2)) * intensity
        : Math.max(0.12, 0.48 - fromEnd * 0.16) * intensity;

      const y = headY - 10 - fromEnd * 14 + bob;
      const x = headX + drift + (fromEnd === 1 ? -6 : fromEnd === 2 ? 8 : 0);
      const label = `«${line}»`;
      const size = isNewest ? 7.5 : 6.5;
      const weight = isNewest ? 600 : 500;
      const color = isNewest
        ? `rgba(236, 232, 220, ${alpha.toFixed(3)})`
        : `rgba(176, 178, 188, ${alpha.toFixed(3)})`;

      // Soft thought-bubble plate (compact, not a full-screen stream).
      const tw = measureUiText(ctx, label, size, weight) + 10;
      const bx = Math.round(Math.max(2, Math.min(canvasWidth - tw - 2, x - tw / 2)));
      const by = Math.round(y - 1);
      ctx.fillStyle = `rgba(10, 12, 18, ${(0.42 * alpha).toFixed(3)})`;
      ctx.fillRect(bx, by, tw, size + 5);
      ctx.strokeStyle = `rgba(200, 190, 160, ${(0.35 * alpha).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, size + 4);

      if (isNewest) {
        // Tiny stem toward the head
        ctx.fillStyle = `rgba(200, 190, 160, ${(0.4 * alpha).toFixed(3)})`;
        ctx.fillRect(Math.round(headX - 1), Math.round(by + size + 5), 2, 3);
        ctx.fillRect(Math.round(headX - 2), Math.round(by + size + 8), 1, 1);
      }

      drawUiText(ctx, label, bx + 5, by + 2, color, size, weight);
    }
  }

  private pushThought(line: string): void {
    this.crisisLine = line;
    this.thoughtTrail.push(line);
    if (this.thoughtTrail.length > THOUGHT_TRAIL_MAX) {
      this.thoughtTrail.shift();
    }
  }

  private clearCrisis(): void {
    this.crisisLine = null;
    this.crisisCooldown = 0;
    this.thoughtTrail = [];
    this.thoughtPulse = 0;
  }
}
