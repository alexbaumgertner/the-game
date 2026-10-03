/**
 * Beer thirst — ~every 2 minutes Zuich must drink a can or freeze in place.
 * Long “Применить бухло” hint shows once, then collapses to an icon.
 * Disabled / paused during 1995 flashback levels.
 */

import { drawUiText, measureUiText, uiPanel } from '@/art/uiFont';

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

    this.crisisCooldown -= dt;
    if (this.crisisCooldown <= 0) {
      this.crisisLine = CRISIS_LINES[this.crisisIndex % CRISIS_LINES.length]!;
      this.crisisIndex += 1;
      this.crisisCooldown = 2.4;
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
      const line2 = 'Пиво раз в ~2 мин';
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

  renderCrisis(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.isFrozen || !this.crisisLine) return;
    const tw = measureUiText(ctx, this.crisisLine, 8, 600) + 18;
    const bx = Math.round((canvasWidth - tw) / 2);
    const by = Math.round(canvasHeight / 2 - 20);
    uiPanel(ctx, bx, by, tw, 18, 'rgba(20,8,12,0.88)', 'rgba(224,64,64,0.75)');
    drawUiText(ctx, this.crisisLine, bx + 9, by + 5, '#f0c0c0', 8, 600);
  }
}
