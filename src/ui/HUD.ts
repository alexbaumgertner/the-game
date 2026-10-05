/**
 * HUD — compact vitals (top-left) + identity/level (top-right).
 * Clear modern sans UI; no overlapping scene title panels.
 */

import { drawUiText, fitUiText, measureUiText, uiPanel } from '@/art/uiFont';
import { SEGA, APT_PAL, TEEN_PAL } from '@/art/segaPalette';

export interface HudSnapshot {
  /** Legacy alias — synced to Mental Fortitude. */
  hp: number;
  maxHp: number;
  eraLabel: string;
  /** Level / location subtitle under era (top-right). */
  levelTitle?: string;
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
    hp: 3000,
    maxHp: 3000,
    eraLabel: 'ЗУИЧ · 2026',
    fortitude: 3000,
    maxFortitude: 3000,
    swagger: 0,
    maxSwagger: 100,
    showSwagger: false,
  };

  set(partial: Partial<HudSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
  }

  update(_dt: number): void {
    // reserved
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number): void {
    const {
      eraLabel,
      levelTitle,
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

    // —— Top-left: vitals only (compact) ——
    const leftW = 96;
    const barW = 84;
    const leftH = showSwagger ? 26 : 16;
    uiPanel(ctx, 2, 2, leftW, leftH, 'rgba(8,10,16,0.82)', 'rgba(200,168,80,0.7)');

    drawUiText(ctx, `СД ${Math.round(mf)}/${mfMax}`, 5, 3, SEGA.white, 6.5, 650);
    const barX = 5;
    const barY = 12;
    ctx.fillStyle = '#222230';
    ctx.fillRect(barX, barY, barW, 2.5);
    const filled = Math.round((mf / Math.max(1, mfMax)) * barW);
    const mfRatio = mf / Math.max(1, mfMax);
    const mfColor = mfRatio <= 0.25 ? '#e04040' : mfRatio <= 0.5 ? '#e0a040' : APT_PAL.brass;
    ctx.fillStyle = mfColor;
    ctx.fillRect(barX, barY, filled, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(barX, barY, filled, 1);

    if (showSwagger) {
      drawUiText(ctx, `ПОНТ ${Math.round(sw)}`, 5, 15.5, TEEN_PAL.scarfHi, 6.5, 650);
      const sBarY = 23.5;
      ctx.fillStyle = '#1a1828';
      ctx.fillRect(barX, sBarY, barW, 2);
      const sFilled = Math.round((sw / Math.max(1, swMax)) * barW);
      ctx.fillStyle = TEEN_PAL.scarf;
      ctx.fillRect(barX, sBarY, sFilled, 2);
    }

    // Objective strip directly under vitals (never overlaps center/right)
    if (objective) {
      const objY = 2 + leftH + 2;
      const obj = fitUiText(ctx, objective, leftW - 6, 6, 550);
      const ow = measureUiText(ctx, obj, 6, 550) + 8;
      uiPanel(ctx, 2, objY, Math.min(leftW, ow), 10, 'rgba(8,14,22,0.78)', 'rgba(80,160,220,0.55)');
      drawUiText(ctx, obj, 5, objY + 1.5, '#90d8ff', 6, 550);
    }

    // —— Top-right: identity + level ——
    const era = eraLabel.replace('·', '·');
    const rightLines = [era];
    if (levelTitle) rightLines.push(levelTitle);
    const rightPad = 5;
    let rightInner = 0;
    for (const line of rightLines) {
      rightInner = Math.max(rightInner, measureUiText(ctx, line, 6.5, 650));
    }
    const rightW = Math.ceil(rightInner + rightPad * 2);
    const rightH = rightLines.length * 9 + 3;
    const rightX = canvasWidth - rightW - 2;
    uiPanel(ctx, rightX, 2, rightW, rightH, 'rgba(6,12,20,0.82)', 'rgba(96,180,220,0.65)');
    drawUiText(ctx, era, rightX + rightPad, 3.5, SEGA.softWhite, 6.5, 650);
    if (levelTitle) {
      drawUiText(ctx, levelTitle, rightX + rightPad, 12.5, '#70d0ff', 6, 550);
    }

    // Pause overlay is owned by PauseMenu (root + settings).
    void paused;

    ctx.restore();
  }
}
