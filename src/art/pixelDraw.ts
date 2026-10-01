/**
 * Integer-pixel Canvas helpers for NES-style drawing.
 * Always call with imageSmoothingEnabled = false on the context.
 */

export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Draw a 1px outline rectangle (chunky NES UI box). */
export function nesBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  border: string,
  inset = true,
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  ctx.fillStyle = border;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = fill;
  ctx.fillRect(ix + 1, iy + 1, iw - 2, ih - 2);
  if (inset) {
    // Inner highlight / shadow for depth
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(ix + 1, iy + 1, iw - 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(ix + 1, iy + ih - 2, iw - 2, 1);
  }
}

/** Stamp a row-major color grid (null = skip). Origin is top-left. */
export function blitGrid(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cols: number,
  rows: number,
  pixels: ReadonlyArray<string | null>,
  scale = 1,
): void {
  const s = Math.max(1, Math.round(scale));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const c = pixels[row * cols + col];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(ox) + col * s, Math.round(oy) + row * s, s, s);
    }
  }
}

/** Checker / wallpaper tile fill over a rect. */
export function fillPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  accent: string,
  period = 8,
  mode: 'dots' | 'checks' | 'stripes' = 'dots',
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  ctx.fillStyle = base;
  ctx.fillRect(ix, iy, iw, ih);

  ctx.fillStyle = accent;
  if (mode === 'checks') {
    for (let py = iy; py < iy + ih; py += period) {
      for (let px_ = ix; px_ < ix + iw; px_ += period) {
        if (((px_ - ix) / period + (py - iy) / period) % 2 < 1) {
          ctx.fillRect(px_, py, Math.min(period, ix + iw - px_), Math.min(period, iy + ih - py));
        }
      }
    }
  } else if (mode === 'stripes') {
    for (let py = iy; py < iy + ih; py += period * 2) {
      ctx.fillRect(ix, py, iw, period);
    }
  } else {
    // dots
    for (let py = iy + 2; py < iy + ih; py += period) {
      for (let px_ = ix + 2; px_ < ix + iw; px_ += period) {
        ctx.fillRect(px_, py, 1, 1);
      }
    }
  }
}

/** Brick row pattern (offset every other row). */
export function fillBricks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  brick: string,
  mortar: string,
  light: string,
  bw = 12,
  bh = 6,
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  ctx.fillStyle = mortar;
  ctx.fillRect(ix, iy, iw, ih);

  for (let row = 0; row * bh < ih; row++) {
    const offset = row % 2 === 0 ? 0 : Math.floor(bw / 2);
    for (let col = -1; col * bw < iw + bw; col++) {
      const bx = ix + col * bw + offset;
      const by = iy + row * bh;
      const clipX = Math.max(bx, ix);
      const clipY = Math.max(by, iy);
      const clipW = Math.min(bx + bw - 1, ix + iw) - clipX;
      const clipH = Math.min(by + bh - 1, iy + ih) - clipY;
      if (clipW <= 0 || clipH <= 0) continue;
      ctx.fillStyle = brick;
      ctx.fillRect(clipX, clipY, clipW, clipH);
      // top highlight
      if (clipH > 1 && clipY === by) {
        ctx.fillStyle = light;
        ctx.fillRect(clipX, clipY, clipW, 1);
      }
    }
  }
}
