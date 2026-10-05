/**
 * ПИВО thirst — «Полезный Истинный Внутрепитейный Облегчатель» = ромашковый чай.
 * Lack ramps hard and fast: colors wash out; thoughts float above Зуич.
 * Drinking a cup restores color. No binge / shout / cigarette pull.
 * Disabled during 1995 flashback levels (`pauseForFlashback`).
 */

import { audio } from '@/audio';
import { drawUiText, measureUiText, uiPanel } from '@/art/uiFont';
import { getSettings } from '@/core/Settings';

/** Seconds from full color to freeze / full gray. */
export const TEA_THIRST_SECONDS = 120;

/** @deprecated Alias for capture scripts / older imports. */
export const BEER_THIRST_SECONDS = TEA_THIRST_SECONDS;

export const PIVO_ACRONYM =
  'Полезный Истинный Внутрепитейный Облегчатель';

export const TEA_HINT_LONG =
  'БЕЗ ПИВО МИР СЕРЕЕТ — НАЙДИ ЧАШКУ И НАЖМИ B. ЧЕРЕЗ ~2 МИН ЗУИЧ ВСТАНЕТ.';

/** @deprecated Alias. */
export const BEER_HINT_LONG = TEA_HINT_LONG;

/** First pickup decode line. */
export const PIVO_FIRST_PICKUP =
  `ПИВО — ${PIVO_ACRONYM}. Это ромашковый чай.`;

/** Internal monologue while thirsty (above head) — no craving to drink alcohol. */
export const CRISIS_LINES = [
  'Что со мной?',
  'Что происходит вокруг?',
  'Что с миром?',
  'Кто я?',
  'Почему так тяжело?',
  'Голова в тумане…',
  'Почему всё серое?',
  'Надо согреться…',
  'Где моя ромашка?',
  'Силы тают…',
  'Холодно внутри…',
] as const;

const THOUGHT_TRAIL_MAX = 3;
const THOUGHT_CYCLE_MAX = 2.4;
const THOUGHT_CYCLE_MIN = 1.2;
const THOUGHT_ONSET = 0.015;

export class TeaSystem {
  /** Seconds until freeze. */
  thirst = TEA_THIRST_SECONDS;
  /** Cups in inventory. */
  cups = 0;
  /** When false, timer does not tick (1995 flashbacks). */
  enabled = true;
  /** True until first successful drink — show long hint. */
  showLongHint = true;
  /** Show acronym toast once after first world pickup. */
  needsAcronymToast = false;
  /** Newest crisis line (also last in thoughtTrail). */
  crisisLine: string | null = null;
  private crisisCooldown = 0;
  private crisisIndex = 0;
  private thoughtTrail: string[] = [];
  private thoughtPulse = 0;
  private thoughtTime = 0;

  /**
   * Compat alias for capture scripts / `window.__novgorod.beer.cans`.
   * Prefer {@link cups}.
   */
  get cans(): number {
    return this.cups;
  }
  set cans(v: number) {
    this.cups = Math.max(0, Math.floor(v));
  }

  /** Compat stubs — binge removed; always idle. */
  consecutiveDrinks = 0;
  secondsSinceDrink = 999;
  bingeShoutTimer = 0;
  cigarettePullTimer = 0;

  get isFrozen(): boolean {
    return this.enabled && this.thirst <= 0;
  }

  /** @deprecated Binge removed — always false. */
  get isBingeChaos(): boolean {
    return false;
  }

  /** @deprecated Binge removed — always false. */
  get wantsCigarettePull(): boolean {
    return false;
  }

  /** 1 = full (just drank), 0 = empty / frozen. */
  get thirstRatio(): number {
    return Math.max(0, Math.min(1, this.thirst / TEA_THIRST_SECONDS));
  }

  /**
   * Visual lack 0→1. Aggressive early ramp — gray reads within seconds,
   * while full gray / freeze still lands at ~2 minutes.
   */
  get lackAmount(): number {
    const t = 1 - this.thirstRatio;
    if (t <= 0) return 0;
    return Math.min(1, Math.pow(t, 0.42) * 0.22 + Math.sqrt(t) * 0.78);
  }

  resetForApartment(): void {
    this.enabled = true;
    if (this.thirst <= 0) this.thirst = Math.min(30, TEA_THIRST_SECONDS);
    this.bingeShoutTimer = 0;
    this.cigarettePullTimer = 0;
  }

  pauseForFlashback(): void {
    this.enabled = false;
    this.clearCrisis();
    this.bingeShoutTimer = 0;
    this.cigarettePullTimer = 0;
  }

  pickup(count = 1): void {
    const wasEmpty = this.cups <= 0;
    this.cups += count;
    if (wasEmpty && this.cups > 0) {
      this.needsAcronymToast = true;
    }
  }

  /** Drink one cup. Returns false if none left or not enabled. */
  drink(): boolean {
    if (!this.enabled) return false;
    if (this.cups <= 0) return false;
    this.cups -= 1;
    this.secondsSinceDrink = 0;
    this.consecutiveDrinks = 1;
    this.thirst = TEA_THIRST_SECONDS;
    this.showLongHint = false;
    this.clearCrisis();
    audio.playSfx('mug');
    return true;
  }

  update(dt: number): void {
    if (!this.enabled) return;

    this.thoughtTime += dt;
    this.secondsSinceDrink += dt;
    this.bingeShoutTimer = 0;
    this.cigarettePullTimer = 0;

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

  /** Compact ПИВО chrome under the top-right identity panel. */
  renderHud(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (!this.enabled) return;

    const top = 26;

    if (this.showLongHint) {
      const line1 = 'B — выпить ПИВО';
      const line2 = 'Без чая мир сереет';
      const tw =
        Math.max(measureUiText(ctx, line1, 6.5, 550), measureUiText(ctx, line2, 6.5, 500)) + 10;
      const bx = canvasWidth - tw - 2;
      uiPanel(ctx, bx, top, tw, 22, 'rgba(12,10,8,0.82)', 'rgba(200,160,72,0.7)');
      drawUiText(ctx, line1, bx + 5, top + 3, '#f0d878', 6.5, 550);
      drawUiText(ctx, line2, bx + 5, top + 12, '#c0b090', 6.5, 500);
      void TEA_HINT_LONG;
      return;
    }

    const label = `ПИВО ×${this.cups}`;
    const bw = Math.max(52, measureUiText(ctx, label, 7, 650) + 22);
    const bx = canvasWidth - bw - 2;
    uiPanel(ctx, bx, top, bw, 16, 'rgba(12,10,8,0.82)', 'rgba(200,160,72,0.7)');
    // Tiny chamomile mug icon
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(bx + 5, top + 5, 7, 6);
    ctx.fillStyle = '#f0e8c0';
    ctx.fillRect(bx + 6, top + 4, 5, 2);
    ctx.fillStyle = '#e8d878';
    ctx.fillRect(bx + 7, top + 5, 3, 2);
    ctx.fillStyle = '#a09070';
    ctx.fillRect(bx + 11, top + 6, 2, 3);
    drawUiText(ctx, label, bx + 15, top + 3, '#f0e8c8', 7, 650);
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
   * Progressive desat + thoughts above the hero.
   * Call after gameplay draw, before tea HUD so chrome stays readable.
   */
  renderCrisis(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    playerX?: number,
    playerY?: number,
  ): void {
    if (!this.enabled) return;

    const headX = playerX ?? canvasWidth / 2;
    const headY = (playerY ?? canvasHeight * 0.65) - 48;

    const lack = this.lackAmount;
    if (lack <= 0 && !this.isFrozen) return;

    this.renderDesaturation(ctx, canvasWidth, canvasHeight, lack);
    this.renderOverheadThoughts(ctx, canvasWidth, headX, headY, lack);

    if (this.isFrozen) {
      const hint = 'B — выпить ПИВО';
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

    const soft = getSettings().reducedEffects;
    // «Меньше эффектов» — softer early wash, capped so the world stays readable.
    const satAlpha = soft
      ? Math.min(0.45, Math.pow(lack, 0.9) * 0.55)
      : Math.min(1, Math.pow(lack, 0.72) * 1.08);
    ctx.save();
    ctx.globalAlpha = satAlpha;
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    const wash = soft ? 0.06 + 0.22 * lack : 0.14 + 0.52 * lack;
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
          : ['Где моя ромашка?'];

    const intensity = Math.min(1, 0.4 + lack * 0.6);
    const newestSize = 7.5 + lack * 7.5;
    const trailSize = 6.5 + lack * 5;
    const rowGap = 12 + lack * 10;

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

      const size = isNewest ? newestSize : trailSize;
      const y = headY - 10 - fromEnd * rowGap + bob;
      const x = headX + drift + (fromEnd === 1 ? -6 : fromEnd === 2 ? 8 : 0);
      const label = `«${line}»`;
      const weight = isNewest ? 650 : 500;
      const color = isNewest
        ? `rgba(236, 232, 220, ${alpha.toFixed(3)})`
        : `rgba(176, 178, 188, ${alpha.toFixed(3)})`;

      const tw = measureUiText(ctx, label, size, weight) + 10;
      const bx = Math.round(Math.max(2, Math.min(canvasWidth - tw - 2, x - tw / 2)));
      const by = Math.round(y - 1);
      const bh = size + 5;
      ctx.fillStyle = `rgba(10, 12, 18, ${(0.42 * alpha).toFixed(3)})`;
      ctx.fillRect(bx, by, tw, bh);
      ctx.strokeStyle = `rgba(200, 190, 160, ${(0.35 * alpha).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, bh - 1);

      if (isNewest) {
        ctx.fillStyle = `rgba(200, 190, 160, ${(0.4 * alpha).toFixed(3)})`;
        ctx.fillRect(Math.round(headX - 1), Math.round(by + bh), 2, 3);
        ctx.fillRect(Math.round(headX - 2), Math.round(by + bh + 3), 1, 1);
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

/** @deprecated Use {@link TeaSystem}. Capture scripts may still import the old name. */
export { TeaSystem as BeerSystem };
