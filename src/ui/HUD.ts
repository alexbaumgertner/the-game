/**
 * HUD — chunky Genesis-style panels + bitmap font (HP / era / MF / pause).
 */

import { segaBox } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';
import { SEGA, APT_PAL } from '@/art/segaPalette';

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  eraLabel: string;
  objective?: string;
  paused?: boolean;
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

    const boxW = 138;
    const boxH = objective ? 42 : 32;
    segaBox(ctx, 2, 2, boxW, boxH, APT_PAL.uiBox, APT_PAL.uiBorder, {
      borderDark: APT_PAL.uiBorderDark,
      fillHi: APT_PAL.uiBoxHi,
    });

    drawNesText(ctx, `HP ${Math.round(hp)}/${maxHp}`, 7, 7, SEGA.white, 1, 1);

    const barX = 7;
    const barY = 17;
    const barW = 124;
    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = APT_PAL.uiBorderDark;
    ctx.fillRect(barX, barY, barW, 1);
    const filled = Math.round((hp / Math.max(1, maxHp)) * barW);
    ctx.fillStyle = APT_PAL.brass;
    ctx.fillRect(barX, barY, filled, 5);
    ctx.fillStyle = APT_PAL.brassHi;
    ctx.fillRect(barX, barY, filled, 2);
    ctx.fillStyle = APT_PAL.uiBorderDark;
    ctx.fillRect(barX, barY + 4, filled, 1);

    drawNesText(ctx, `MF ${mf}`, 7, 25, APT_PAL.brassHi, 1, 1);

    if (objective) {
      let obj = objective.toUpperCase();
      while (measureNesText(obj, 1, 1) > boxW - 10 && obj.length > 3) {
        obj = `${obj.slice(0, -2)}.`;
      }
      drawNesText(ctx, obj, 7, 34, '#70d0ff', 1, 1);
    }

    const era = eraLabel.toUpperCase().replace('·', '-');
    const eraW = measureNesText(era, 1, 1) + 12;
    segaBox(ctx, canvasWidth - eraW - 2, 2, eraW, 14, '#081018', '#70d0ff', {
      borderDark: '#2870a0',
      fillHi: '#182838',
    });
    drawNesText(ctx, era, canvasWidth - eraW + 4, 6, SEGA.softWhite, 1, 1);

    if (paused) {
      ctx.fillStyle = 'rgba(8, 8, 14, 0.72)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      const pw = measureNesText('PAUSED', 2, 1) + 20;
      segaBox(
        ctx,
        Math.round((canvasWidth - pw) / 2),
        Math.round(canvasHeight / 2 - 16),
        pw,
        28,
        APT_PAL.uiBox,
        APT_PAL.uiBorder,
        { borderDark: APT_PAL.uiBorderDark },
      );
      drawNesTextCentered(ctx, 'PAUSED', canvasWidth / 2, canvasHeight / 2 - 4, SEGA.white, 2, 1);
    }

    ctx.restore();
  }
}
