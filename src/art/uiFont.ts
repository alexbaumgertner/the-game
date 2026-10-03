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

/**
 * World interact cue: ↑ + short CTA, subtle bob — no strobing squares.
 * Soft text+shadow only (minimal chrome).
 */
export function drawInteractPrompt(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  label: string,
  timeSec: number,
  opts: { color?: string; size?: number } = {},
): void {
  const color = opts.color ?? '#f8f0d0';
  const size = opts.size ?? 7;
  const bob = Math.sin(timeSec * 3.6) * 1.5;
  const y = Math.round(anchorY + bob) - size - 4;
  const text = `↑ ${label}`;
  const tw = measureUiText(ctx, text, size, 650);
  drawUiText(ctx, text, Math.round(anchorX - tw / 2), y, color, size, 650);
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
