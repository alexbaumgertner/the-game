/**
 * Beer thirst — ~every 2 minutes Zuich must drink a can or freeze in place.
 * Long “Применить бухло” hint shows once, then collapses to an icon.
 * Disabled / paused during 1995 flashback levels.
 */

import { drawNesText, measureNesText } from '@/art/nesFont';
import { segaBox } from '@/art/pixelDraw';
import { APT_PAL } from '@/art/segaPalette';

/** Seconds between drinks. */
export const BEER_THIRST_SECONDS = 120;

export const BEER_HINT_LONG =
  'РАЗ В ~2 МИН НАЙДИ ПИВО И НАЖМИ B — ПРИМЕНИТЬ БУХЛО. БЕЗ НЕГО ЗУИЧ ВСТАНЕТ.';

export const CRISIS_LINES = [
  'ЧТО СО МНОЙ?',
  'ЧТО ПРОИСХОДИТ ВОКРУГ?',
  'ЧТО С МИРОМ?',
  'КТО Я?',
  'ПОЧЕМУ ТАК ТЯЖЕЛО?',
  'ГДЕ МОЁ ПИВО?',
] as const;

export class BeerSystem {
  /** Seconds until freeze. */
  thirst = BEER_THIRST_SECONDS;
  /** Cans in inventory. */
  cans = 0;
  /** When false, timer does not tick (1995 flashbacks). */
  enabled = true;
  /** True until first successful drink — show long hint. */
  showLongHint = true;
  crisisLine: string | null = null;
  private crisisCooldown = 0;
  private crisisIndex = 0;

  get isFrozen(): boolean {
    return this.enabled && this.thirst <= 0;
  }

  get thirstRatio(): number {
    return Math.max(0, Math.min(1, this.thirst / BEER_THIRST_SECONDS));
  }

  resetForApartment(): void {
    this.enabled = true;
    // Keep cans / hint state across flashbacks; top up thirst gently if mid-crisis
    if (this.thirst <= 0) this.thirst = Math.min(30, BEER_THIRST_SECONDS);
  }

  pauseForFlashback(): void {
    this.enabled = false;
    this.crisisLine = null;
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
    this.crisisLine = null;
    this.crisisCooldown = 0;
    return true;
  }

  update(dt: number): void {
    if (!this.enabled) return;

    if (this.thirst > 0) {
      this.thirst = Math.max(0, this.thirst - dt);
      this.crisisLine = null;
      return;
    }

    // Frozen — cycle existential mutterings
    this.crisisCooldown -= dt;
    if (this.crisisCooldown <= 0) {
      this.crisisLine = CRISIS_LINES[this.crisisIndex % CRISIS_LINES.length]!;
      this.crisisIndex += 1;
      this.crisisCooldown = 2.4;
    }
  }

  /**
   * HUD chrome: long hint once, then beer icon + can count + thirst bar.
   * Drawn top-right under era label.
   */
  renderHud(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (!this.enabled) return;

    const P = APT_PAL;
    const top = 20;

    if (this.showLongHint) {
      const label = BEER_HINT_LONG;
      // Wrap into two short lines for the narrow HUD
      const line1 = 'B - ПРИМЕНИТЬ БУХЛО';
      const line2 = 'ПИВО РАЗ В ~2 МИН';
      const tw = Math.max(measureNesText(line1, 1, 1), measureNesText(line2, 1, 1)) + 14;
      const bx = canvasWidth - tw - 2;
      segaBox(ctx, bx, top, tw, 28, P.uiBox, '#c8a048', { borderDark: P.uiBorderDark });
      drawNesText(ctx, line1, bx + 5, top + 5, '#f0d878', 1, 1);
      drawNesText(ctx, line2, bx + 5, top + 15, '#c0b090', 1, 1);
      void label;
      return;
    }

    // Compact icon + count + thirst pip
    const bw = 52;
    const bx = canvasWidth - bw - 2;
    segaBox(ctx, bx, top, bw, 18, P.uiBox, '#c8a048', { borderDark: P.uiBorderDark });
    // Can icon
    ctx.fillStyle = '#d8a040';
    ctx.fillRect(bx + 5, top + 4, 6, 10);
    ctx.fillStyle = '#f0c868';
    ctx.fillRect(bx + 6, top + 5, 4, 2);
    ctx.fillStyle = '#808890';
    ctx.fillRect(bx + 6, top + 3, 4, 2);
    drawNesText(ctx, `x${this.cans}`, bx + 14, top + 6, '#f0e8c8', 1, 1);
    // Thirst bar
    const barX = bx + 5;
    const barY = top + 14;
    const barW = bw - 10;
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(barX, barY, barW, 2);
    const fill = Math.round(this.thirstRatio * barW);
    ctx.fillStyle = this.thirstRatio <= 0.2 ? '#e04040' : '#e0a040';
    ctx.fillRect(barX, barY, fill, 2);
  }

  renderCrisis(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.isFrozen || !this.crisisLine) return;
    const tw = measureNesText(this.crisisLine, 1, 1) + 20;
    const bx = Math.round((canvasWidth - tw) / 2);
    const by = Math.round(canvasHeight / 2 - 20);
    segaBox(ctx, bx, by, tw, 22, '#1a1018', '#e04040', { borderDark: '#802028' });
    drawNesText(ctx, this.crisisLine, bx + 10, by + 8, '#f0c0c0', 1, 1);
  }
}
