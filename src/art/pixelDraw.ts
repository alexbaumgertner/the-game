/**
 * Integer-pixel Canvas helpers for Genesis-style drawing.
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

/**
 * Chunky 16-bit UI panel: outer border, bevel highlight/shadow, optional
 * inner fill band (Genesis / SNES dialogue-box feel).
 */
export function segaBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  border: string,
  opts: { inset?: boolean; borderDark?: string; fillHi?: string } = {},
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  const borderDark = opts.borderDark ?? '#000000';
  const inset = opts.inset !== false;

  // Outer dark rim
  ctx.fillStyle = borderDark;
  ctx.fillRect(ix, iy, iw, ih);
  // Bright border
  ctx.fillStyle = border;
  ctx.fillRect(ix + 1, iy + 1, iw - 2, ih - 2);
  // Fill
  ctx.fillStyle = fill;
  ctx.fillRect(ix + 2, iy + 2, iw - 4, ih - 4);

  if (inset) {
    const hi = opts.fillHi ?? 'rgba(255,255,255,0.18)';
    ctx.fillStyle = hi;
    ctx.fillRect(ix + 2, iy + 2, iw - 4, 1);
    ctx.fillRect(ix + 2, iy + 2, 1, ih - 4);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(ix + 2, iy + ih - 3, iw - 4, 1);
    ctx.fillRect(ix + iw - 3, iy + 2, 1, ih - 4);
  }
}

/** Alias — NES pass used nesBox; scenes/HUD can call either. */
export const nesBox = segaBox;

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

/** Checker / wallpaper / motif fill over a rect. */
export function fillPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  accent: string,
  period = 8,
  mode: 'dots' | 'checks' | 'stripes' | 'diamonds' | 'cross' = 'dots',
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
  } else if (mode === 'diamonds') {
    for (let py = iy + 3; py < iy + ih; py += period) {
      for (let px_ = ix + 3; px_ < ix + iw; px_ += period) {
        ctx.fillRect(px_, py, 1, 1);
        ctx.fillRect(px_ + 1, py + 1, 1, 1);
        ctx.fillRect(px_, py + 2, 1, 1);
        ctx.fillRect(px_ - 1, py + 1, 1, 1);
      }
    }
  } else if (mode === 'cross') {
    for (let py = iy + 2; py < iy + ih; py += period) {
      for (let px_ = ix + 2; px_ < ix + iw; px_ += period) {
        ctx.fillRect(px_, py, 3, 1);
        ctx.fillRect(px_ + 1, py - 1, 1, 3);
      }
    }
  } else {
    for (let py = iy + 2; py < iy + ih; py += period) {
      for (let px_ = ix + 2; px_ < ix + iw; px_ += period) {
        ctx.fillRect(px_, py, 1, 1);
      }
    }
  }
}

/**
 * Ordered 2×2 dither blend between two colors — cheap Genesis shading
 * for sky bands / floor gradients without true alpha.
 */
export function ditherRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  a: string,
  b: string,
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  ctx.fillStyle = a;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = b;
  for (let py = iy; py < iy + ih; py++) {
    for (let px_ = ix; px_ < ix + iw; px_++) {
      if (((px_ ^ py) & 1) === 0) ctx.fillRect(px_, py, 1, 1);
    }
  }
}

/** Vertical gradient via stacked bands + optional dither seams. */
export function fillSkyGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  bands: ReadonlyArray<{ y: number; h: number; color: string }>,
  ditherPairs?: ReadonlyArray<{ y: number; a: string; b: string }>,
): void {
  for (const band of bands) {
    px(ctx, 0, band.y, width, band.h, band.color);
  }
  if (ditherPairs) {
    for (const d of ditherPairs) {
      ditherRect(ctx, 0, d.y, width, 2, d.a, d.b);
    }
  }
}

/** Brick row pattern with highlight + shadow bevels. */
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
  shadow?: string,
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
      if (clipH > 1 && clipY === by) {
        ctx.fillStyle = light;
        ctx.fillRect(clipX, clipY, clipW, 1);
      }
      if (shadow && clipH > 2) {
        ctx.fillStyle = shadow;
        ctx.fillRect(clipX, clipY + clipH - 1, clipW, 1);
        if (clipW > 2) ctx.fillRect(clipX + clipW - 1, clipY, 1, clipH);
      }
    }
  }
}
