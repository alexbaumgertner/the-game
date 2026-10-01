/**
 * HUD — Genesis-style Mental Fortitude + Street Swagger panels.
 */

import { segaBox } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';
import { SEGA, APT_PAL, TEEN_PAL } from '@/art/segaPalette';

export interface HudSnapshot {
  /** Legacy alias — synced to Mental Fortitude. */
  hp: number;
  maxHp: number;
  eraLabel: string;
  objective?: string;
  paused?: boolean;
  fortitude?: number;
  maxFortitude?: number;
  swagger?: number;
  maxSwagger?: number;
  /** Show swagger meter (1995 combat). */
  showSwagger?: boolean;
}

export class HUD {
  private snapshot: HudSnapshot = {
    hp: 100,
    maxHp: 100,
    eraLabel: 'ADULT · 2026',
    fortitude: 100,
    maxFortitude: 100,
    swagger: 0,
    maxSwagger: 100,
    showSwagger: false,
  };

  set(partial: Partial<HudSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
  }

  update(_dt: number): void {
    // Bar flash hooks reserved for polish
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const {
      eraLabel,
      objective,
      paused,
      fortitude,
      maxFortitude,
      swagger,
      maxSwagger,
      showSwagger,
      hp,
      maxHp,
    } = this.snapshot;

    const mf = fortitude ?? Math.round(hp);
    const mfMax = maxFortitude ?? maxHp;
    const sw = swagger ?? 0;
    const swMax = maxSwagger ?? 100;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const boxW = 148;
    const boxH = showSwagger ? (objective ? 52 : 42) : objective ? 42 : 32;
    segaBox(ctx, 2, 2, boxW, boxH, APT_PAL.uiBox, APT_PAL.uiBorder, {
      borderDark: APT_PAL.uiBorderDark,
      fillHi: APT_PAL.uiBoxHi,
    });

    drawNesText(ctx, `MF ${Math.round(mf)}/${mfMax}`, 7, 7, SEGA.white, 1, 1);

    const barX = 7;
    const barY = 17;
    const barW = 134;
    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = APT_PAL.uiBorderDark;
    ctx.fillRect(barX, barY, barW, 1);
    const filled = Math.round((mf / Math.max(1, mfMax)) * barW);
    const mfColor = mf <= 25 ? '#e04040' : mf <= 50 ? '#e0a040' : APT_PAL.brass;
    const mfHi = mf <= 25 ? '#f08080' : mf <= 50 ? '#f0c070' : APT_PAL.brassHi;
    ctx.fillStyle = mfColor;
    ctx.fillRect(barX, barY, filled, 5);
    ctx.fillStyle = mfHi;
    ctx.fillRect(barX, barY, filled, 2);
    ctx.fillStyle = APT_PAL.uiBorderDark;
    ctx.fillRect(barX, barY + 4, filled, 1);

    let nextY = 25;
    if (showSwagger) {
      drawNesText(ctx, `SWAG ${Math.round(sw)}`, 7, nextY, TEEN_PAL.scarfHi, 1, 1);
      nextY = 33;
      const sBarY = nextY;
      ctx.fillStyle = '#1a1828';
      ctx.fillRect(barX, sBarY, barW, 4);
      const sFilled = Math.round((sw / Math.max(1, swMax)) * barW);
      ctx.fillStyle = TEEN_PAL.scarf;
      ctx.fillRect(barX, sBarY, sFilled, 4);
      ctx.fillStyle = TEEN_PAL.scarfHi;
      ctx.fillRect(barX, sBarY, sFilled, 1);
      nextY = 40;
    }

    if (objective) {
      let obj = objective.toUpperCase();
      while (measureNesText(obj, 1, 1) > boxW - 10 && obj.length > 3) {
        obj = `${obj.slice(0, -2)}.`;
      }
      drawNesText(ctx, obj, 7, showSwagger ? nextY : 34, '#70d0ff', 1, 1);
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
