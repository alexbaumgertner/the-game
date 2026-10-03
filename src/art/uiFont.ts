/**
 * Crisp modern UI typography — canvas fillText with system sans.
 * Glyphs are rasterized in buffer-pixel space (undo logical transform)
 * so Hi-DPI stays sharp. NOT retro 8/16-bit bitmap.
 */

import { getDisplayMetrics } from '@/core/Display';

const UI_STACK = 'system-ui, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

export function uiFontFace(sizePx: number, weight: number | string = 600): string {
  return `${weight} ${sizePx}px ${UI_STACK}`;
}

/** Current logical→buffer scale (fallback 2). */
function bufferScale(ctx: CanvasRenderingContext2D): number {
  const t = ctx.getTransform().a;
  if (t > 0) return t;
  return getDisplayMetrics().logicalToBuffer || 2;
}

export function measureUiText(
  ctx: CanvasRenderingContext2D,
  text: string,
  size = 8,
  weight: number | string = 600,
): number {
  const scale = bufferScale(ctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = uiFontFace(size * scale, weight);
  const w = ctx.measureText(text).width / scale;
  ctx.restore();
  return w;
}

/**
 * Draw sharp UI text. Coordinates are logical (320×224 space);
 * rasterization happens at buffer resolution for clean glyphs.
 */
export function drawUiText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 8,
  weight: number | string = 600,
): number {
  const scale = bufferScale(ctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.font = uiFontFace(size * scale, weight);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const px = x * scale;
  const py = y * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(text, px + 1, py + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, px, py);
  const w = ctx.measureText(text).width / scale;
  ctx.restore();
  return w;
}

export function drawUiTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  color: string,
  size = 8,
  weight: number | string = 600,
): void {
  const w = measureUiText(ctx, text, size, weight);
  drawUiText(ctx, text, Math.round(centerX - w / 2), y, color, size, weight);
}

/** Truncate with ellipsis to fit max width (logical px). */
export function fitUiText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  size = 8,
  weight: number | string = 600,
): string {
  if (measureUiText(ctx, text, size, weight) <= maxW) return text;
  let t = text;
  while (t.length > 1 && measureUiText(ctx, `${t}…`, size, weight) > maxW) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

/** Label+arrow duration after entering a hotspot; then arrow-only while inside. */
export const HOTSPOT_LABEL_SEC = 5;

/**
 * Per-hotspot enter clock: on enter → label for {@link HOTSPOT_LABEL_SEC}s,
 * then arrow only until the player leaves and re-enters.
 */
export class HotspotHintClock {
  private enteredAt = new Map<string, number>();

  sample(id: string, inside: boolean, nowSec: number): { active: boolean; showLabel: boolean } {
    if (!inside) {
      this.enteredAt.delete(id);
      return { active: false, showLabel: false };
    }
    let t0 = this.enteredAt.get(id);
    if (t0 === undefined) {
      t0 = nowSec;
      this.enteredAt.set(id, t0);
    }
    return { active: true, showLabel: nowSec - t0 < HOTSPOT_LABEL_SEC };
  }

  clear(): void {
    this.enteredAt.clear();
  }
}

/**
 * World interact cue: ↑ + compact CTA (optional), subtle bob — no strobing squares.
 * Soft text+shadow only (minimal chrome).
 */
export function drawInteractPrompt(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  label: string,
  timeSec: number,
  opts: { color?: string; size?: number; showLabel?: boolean } = {},
): void {
  const color = opts.color ?? '#f8f0d0';
  const size = opts.size ?? 5.5;
  const showLabel = opts.showLabel !== false;
  const bob = Math.sin(timeSec * 3.6) * 1.5;
  const y = Math.round(anchorY + bob) - size - 4;
  if (showLabel) {
    const text = `↑ ${label}`;
    const tw = measureUiText(ctx, text, size, 550);
    drawUiText(ctx, text, Math.round(anchorX - tw / 2), y, color, size, 550);
  } else {
    const arrow = '↑';
    const arrowSize = size + 1.5;
    const tw = measureUiText(ctx, arrow, arrowSize, 700);
    drawUiText(ctx, arrow, Math.round(anchorX - tw / 2), y, color, arrowSize, 700);
  }
}

/** Slim translucent HUD panel — lighter than chunky segaBox. */
export function uiPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = 'rgba(10, 12, 18, 0.78)',
  border = 'rgba(200, 170, 90, 0.75)',
): void {
  const scale = bufferScale(ctx);
  const ix = Math.round(x * scale) / scale;
  const iy = Math.round(y * scale) / scale;
  const iw = Math.round(w * scale) / scale;
  const ih = Math.round(h * scale) / scale;
  ctx.fillStyle = fill;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1 / scale;
  ctx.strokeRect(ix + 0.5 / scale, iy + 0.5 / scale, iw - 1 / scale, ih - 1 / scale);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(ix + 1 / scale, iy + 1 / scale, iw - 2 / scale, 1 / scale);
}
