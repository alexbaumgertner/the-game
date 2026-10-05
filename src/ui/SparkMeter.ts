/**
 * SparkMeter — «Искра» 0..1 for levels 9–10 (obedience / voluntary structure).
 * Shared HUD chrome; scenes own when to add/drain.
 */

import { drawUiText, measureUiText, uiPanel } from '@/art/uiFont';

export class SparkMeter {
  /** Current spark in 0..1. */
  value = 0.55;

  add(amount: number): void {
    this.value = Math.max(0, Math.min(1, this.value + amount));
  }

  drain(amount: number): void {
    this.add(-Math.abs(amount));
  }

  reset(value = 0.55): void {
    this.value = Math.max(0, Math.min(1, value));
  }

  /**
   * Compact bar under identity panel (top-right), below tea HUD when both show.
   */
  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, top = 44): void {
    const label = 'Искра';
    const bw = 56;
    const bx = canvasWidth - bw - 2;
    uiPanel(ctx, bx, top, bw, 14, 'rgba(12,10,8,0.82)', 'rgba(160,180,200,0.55)');
    drawUiText(ctx, label, bx + 4, top + 2, '#c8d0d8', 5.5, 600);
    const barX = bx + 4;
    const barY = top + 10;
    const barW = bw - 8;
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(barX, barY, barW, 2);
    const fill = Math.round(this.value * barW);
    const hot = this.value < 0.25;
    ctx.fillStyle = hot ? '#c06050' : '#70a0c8';
    ctx.fillRect(barX, barY, fill, 2);
    void measureUiText;
  }
}
