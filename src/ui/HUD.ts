/**
 * HUD — NES chunky boxes + bitmap font (HP / era / Mental Fortitude / pause).
 */

import { nesBox } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';
import { NES } from '@/art/nesPalette';

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  eraLabel: string;
  objective?: string;
  paused?: boolean;
  /** Optional Mental Fortitude label (Phase 2+). */
  fortitude?: number;
}

export class HUD {
  private snapshot: HudSnapshot = {
    hp: 100,
    maxHp: 100,
    eraLabel: 'ADULT · 2026',
    fortitude: 100,
  };

  set(partial: Partial<HudSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
  }

  update(_dt: number): void {
    // TODO: animate HP bar drain, flash on hit
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const { hp, maxHp, eraLabel, objective, paused, fortitude } = this.snapshot;
    const mf = fortitude ?? Math.round(hp);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Top-left status box
    const boxW = 108;
    const boxH = objective ? 36 : 28;
    nesBox(ctx, 2, 2, boxW, boxH, '#101018', '#c4a040', true);

    drawNesText(ctx, `HP ${Math.round(hp)}/${maxHp}`, 6, 6, NES.white, 1, 1);

    // Mini HP bar
    const barX = 6;
    const barY = 15;
    const barW = 96;
    ctx.fillStyle = '#3c3c3c';
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = '#c4a040';
    ctx.fillRect(barX, barY, Math.round((hp / Math.max(1, maxHp)) * barW), 4);
    ctx.fillStyle = '#fcfcfc';
    ctx.fillRect(barX, barY, Math.round((hp / Math.max(1, maxHp)) * barW), 1);

    drawNesText(ctx, `MF ${mf}`, 6, 21, '#e8c56a', 1, 1);

    if (objective) {
      // Truncate long objectives to fit box
      let obj = objective.toUpperCase();
      while (measureNesText(obj, 1, 1) > boxW - 8 && obj.length > 3) {
        obj = obj.slice(0, -1);
      }
      drawNesText(ctx, obj, 6, 29, '#6ec6ff', 1, 1);
    }

    // Era badge (top-right)
    const era = eraLabel.toUpperCase().replace('·', '-');
    const eraW = measureNesText(era, 1, 1) + 10;
    nesBox(ctx, canvasWidth - eraW - 2, 2, eraW, 12, '#101820', '#6ec6ff', true);
    drawNesText(ctx, era, canvasWidth - eraW + 3, 5, NES.softWhite, 1, 1);

    if (paused) {
      ctx.fillStyle = 'rgba(10, 10, 12, 0.7)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      const pw = measureNesText('PAUSED', 2, 1) + 16;
      nesBox(ctx, Math.round((canvasWidth - pw) / 2), canvasHeight / 2 - 14, pw, 24, '#101018', '#e8c56a');
      drawNesTextCentered(ctx, 'PAUSED', canvasWidth / 2, canvasHeight / 2 - 4, NES.white, 2, 1);
    }

    ctx.restore();
  }
}
