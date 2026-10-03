/**
 * Beer thirst — ~every 2 minutes Zuich must drink a can or freeze in place.
 * Long “Применить бухло” hint shows once, then collapses to an icon.
 * On freeze: gray desaturated screen + cycling мыслепоток until drink succeeds.
 * Disabled / paused during 1995 flashback levels.
 */

import { drawUiText, drawUiTextCentered, measureUiText, uiPanel } from '@/art/uiFont';

/** Seconds between drinks. */
export const BEER_THIRST_SECONDS = 120;

export const BEER_HINT_LONG =
  'РАЗ В ~2 МИН НАЙДИ ПИВО И НАЖМИ B — ПРИМЕНИТЬ БУХЛО. БЕЗ НЕГО ЗУИЧ ВСТАНЕТ.';

/** Internal monologue while stuck without beer. */
export const CRISIS_LINES = [
  'Что со мной?',
  'Что происходит вокруг?',
  'Что с миром?',
  'Кто я?',
  'Почему так тяжело?',
  'Где моё пиво?',
  'Почему всё серое?',
  'Надо выпить…',
] as const;

const THOUGHT_TRAIL_MAX = 4;
const THOUGHT_CYCLE_SEC = 2.4;

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
  /** Fading trail of recent thoughts for мыслепоток. */
  private thoughtTrail: string[] = [];
  /** 0→1 progress through current thought cycle (for fade). */
  private thoughtPulse = 0;

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

    if (this.thirst > 0) {
      this.thirst = Math.max(0, this.thirst - dt);
      if (this.thirst > 0) {
        this.clearCrisis();
        return;
      }
      // Just hit zero — start мыслепоток immediately.
      this.crisisCooldown = 0;
    }

    this.crisisCooldown -= dt;
    this.thoughtPulse = 1 - Math.max(0, this.crisisCooldown) / THOUGHT_CYCLE_SEC;
    if (this.crisisCooldown <= 0) {
      this.pushThought(CRISIS_LINES[this.crisisIndex % CRISIS_LINES.length]!);
      this.crisisIndex += 1;
      this.crisisCooldown = THOUGHT_CYCLE_SEC;
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

  /**
   * Full-screen gray / desaturate + cycling мыслепоток while frozen.
   * Call before beer HUD so chrome stays readable on top.
   */
  renderCrisis(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.isFrozen) return;

    // Desaturate already-drawn gameplay (saturation composite → gray source).
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    // Cool gray wash — world stays readable but drained of color.
    ctx.fillStyle = 'rgba(36, 38, 46, 0.48)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const trail =
      this.thoughtTrail.length > 0
        ? this.thoughtTrail
        : this.crisisLine
          ? [this.crisisLine]
          : ['Что со мной?'];

    const baseY = Math.round(canvasHeight * 0.34);
    const lineH = 16;

    for (let i = 0; i < trail.length; i++) {
      const line = trail[i]!;
      const fromEnd = trail.length - 1 - i;
      const isNewest = fromEnd === 0;
      // Older thoughts fade and sit higher.
      const alpha = isNewest
        ? 0.55 + 0.45 * Math.min(1, this.thoughtPulse + 0.25)
        : Math.max(0.18, 0.55 - fromEnd * 0.14);
      const y = baseY - fromEnd * lineH;
      const label = `«${line}»`;
      const size = isNewest ? 9 : 7.5;
      const weight = isNewest ? 600 : 500;
      const color = isNewest
        ? `rgba(232, 228, 220, ${alpha.toFixed(3)})`
        : `rgba(170, 172, 180, ${alpha.toFixed(3)})`;
      drawUiTextCentered(ctx, label, canvasWidth / 2, y, color, size, weight);
    }

    // Persistent drink prompt while stuck.
    const hint = 'B — применить бухло';
    const hintW = measureUiText(ctx, hint, 7, 600) + 16;
    const hx = Math.round((canvasWidth - hintW) / 2);
    const hy = canvasHeight - 36;
    uiPanel(ctx, hx, hy, hintW, 16, 'rgba(12,10,8,0.78)', 'rgba(180,160,100,0.55)');
    drawUiText(ctx, hint, hx + 8, hy + 4, '#e8d090', 7, 600);
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
