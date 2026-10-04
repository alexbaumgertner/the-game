/**
 * HUD / dialogue typography — raster pixel font (nesFont), no subpixel AA.
 *
 * API kept compatible with the old fillText uiFont so scenes/systems keep
 * calling drawUiText / measureUiText / uiPanel. Glyphs are integer-scaled
 * 5×7 bitmaps snapped to the logical 320×224 grid.
 */

import { segaBox } from './pixelDraw';
import {
  drawNesText,
  drawNesTextCentered,
  measureNesText,
} from './nesFont';

/** Map former fillText sizes (logical px) → integer bitmap scale. */
function glyphScale(size: number): number {
  if (size >= 11) return 2;
  return 1;
}

/** Tracking: keep dense for HUD chrome. */
const TRACK = 1;

export function uiFontFace(_sizePx: number, _weight: number | string = 600): string {
  // Kept for API compat; bitmap path does not use CSS fonts.
  return 'pixel';
}

export function measureUiText(
  _ctx: CanvasRenderingContext2D,
  text: string,
  size = 8,
  _weight: number | string = 600,
): number {
  return measureNesText(text, glyphScale(size), TRACK);
}

/**
 * Draw sharp UI text. Coordinates are logical (320×224 space).
 * Uses nesFont bitmaps — no Canvas fillText / antialiasing.
 */
export function drawUiText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 8,
  _weight: number | string = 600,
): number {
  const s = glyphScale(size);
  const ix = Math.round(x);
  const iy = Math.round(y);
  // 1px dark drop for readability (integer only)
  drawNesText(ctx, text, ix + 1, iy + 1, '#000000', s, TRACK);
  return drawNesText(ctx, text, ix, iy, color, s, TRACK);
}

export function drawUiTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  color: string,
  size = 8,
  _weight: number | string = 600,
): void {
  const s = glyphScale(size);
  const iy = Math.round(y);
  const w = measureNesText(text, s, TRACK);
  const ix = Math.round(centerX - w / 2);
  drawNesText(ctx, text, ix + 1, iy + 1, '#000000', s, TRACK);
  drawNesTextCentered(ctx, text, centerX, iy, color, s, TRACK);
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
  const bob = Math.round(Math.sin(timeSec * 3.6) * 1.5);
  const y = Math.round(anchorY + bob) - 10;
  if (showLabel) {
    const text = `↑ ${label}`;
    const tw = measureUiText(ctx, text, size, 550);
    drawUiText(ctx, text, Math.round(anchorX - tw / 2), y, color, size, 550);
  } else {
    const arrow = '↑';
    const tw = measureUiText(ctx, arrow, size + 1.5, 700);
    drawUiText(ctx, arrow, Math.round(anchorX - tw / 2), y, color, size + 1.5, 700);
  }
}

/** Slim HUD panel — integer segaBox (no hairline subpixel stroke). */
export function uiPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = 'rgba(10, 12, 18, 0.78)',
  border = 'rgba(200, 170, 90, 0.75)',
): void {
  segaBox(ctx, x, y, w, h, fill, border, {
    inset: true,
    borderDark: '#000000',
    fillHi: 'rgba(255,255,255,0.12)',
  });
}
