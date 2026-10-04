/**
 * Night snow / weather flakes snapped to the logical integer pixel grid.
 * Motion advances in discrete pixel steps (no subpixel drift).
 */

export interface SnowColors {
  hi: string;
  mid: string;
  lo: string;
}

/**
 * Draw falling snow. `time` in seconds; positions quantize to integer ticks.
 */
export function drawSnappedSnow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
  time: number,
  colors: SnowColors,
  count = 48,
): void {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  // ~10 Hz pixel clock — flakes jump whole pixels
  const tick = Math.floor(time * 10);
  const scrollPx = Math.round(scroll);

  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < count; i++) {
    const fall = 1 + (i % 5); // px per tick
    const drift = (i % 5) - 2; // -2..+2 px per tick
    const big = i % 4 === 0;
    let sx = (i * 47 + tick * drift + Math.floor(scrollPx * 0.35)) % w;
    let sy = (i * 29 + tick * fall) % h;
    if (sx < 0) sx += w;
    if (sy < 0) sy += h;
    ctx.fillStyle = big ? colors.hi : i % 3 === 0 ? colors.mid : colors.lo;
    ctx.fillRect(sx, sy, big ? 2 : 1, big ? 2 : 1);
  }
}
