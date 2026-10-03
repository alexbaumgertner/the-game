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

/** Checker / wallpaper / motif fill over a rect — finer hi-bit midtones. */
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
    const p = Math.max(3, Math.floor(period / 2) * 2 || period);
    for (let py = iy; py < iy + ih; py += p) {
      for (let px_ = ix; px_ < ix + iw; px_ += p) {
        if (((px_ - ix) / p + (py - iy) / p) % 2 < 1) {
          ctx.fillRect(px_, py, Math.min(p, ix + iw - px_), Math.min(p, iy + ih - py));
        }
      }
    }
  } else if (mode === 'stripes') {
    for (let py = iy; py < iy + ih; py += period * 2) {
      ctx.fillRect(ix, py, iw, Math.max(1, Math.floor(period / 2)));
    }
  } else if (mode === 'diamonds') {
    // Denser wallpaper motif with soft midtone flecks
    const step = Math.max(6, Math.floor(period * 0.75));
    for (let py = iy + 2; py < iy + ih; py += step) {
      for (let px_ = ix + 2; px_ < ix + iw; px_ += step) {
        ctx.fillStyle = accent;
        ctx.fillRect(px_, py + 1, 1, 1);
        ctx.fillRect(px_ + 1, py, 1, 1);
        ctx.fillRect(px_ + 1, py + 2, 1, 1);
        ctx.fillRect(px_ + 2, py + 1, 1, 1);
        // Midtone secondary fleck
        if (((px_ + py) / step) % 2 < 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(px_ + 3, py + 3, 1, 1);
        }
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
        if (((px_ + py) & 3) === 0) ctx.fillRect(px_ + 2, py + 1, 1, 1);
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

/**
 * Brick row pattern with midtones + soft bevels (hi-bit, less chunky).
 * Smaller default bricks, mortar hairlines, speckled variation.
 */
export function fillBricks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  brick: string,
  mortar: string,
  light: string,
  bw = 10,
  bh = 5,
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

      // Base brick + subtle midtone banding
      ctx.fillStyle = brick;
      ctx.fillRect(clipX, clipY, clipW, clipH);
      if (clipH > 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(clipX, clipY + 1, clipW, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(clipX, clipY + Math.floor(clipH / 2), clipW, 1);
      }
      // Speckle variation (stable pseudo-hash)
      const hash = ((bx * 17) ^ (by * 31)) & 7;
      if (hash === 0 && clipW > 3 && clipH > 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(clipX + 2, clipY + 2, 1, 1);
      } else if (hash === 3 && clipW > 4) {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(clipX + clipW - 3, clipY + 1, 1, 1);
      }

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

/**
 * Fine wood grain over a plank rect — multi-shade streaks + knots.
 * Integer pixels only (no smoothing).
 */
export function woodGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  hi: string,
  mid: string,
  dark: string,
  vertical = true,
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  ctx.fillStyle = base;
  ctx.fillRect(ix, iy, iw, ih);
  if (vertical) {
    for (let gx = ix + 1; gx < ix + iw - 1; gx += 3) {
      const tone = ((gx - ix) / 3) % 3;
      ctx.fillStyle = tone === 0 ? hi : tone === 1 ? mid : dark;
      ctx.fillRect(gx, iy + 1, 1, Math.max(1, ih - 2));
      if (tone === 0 && ih > 8) {
        ctx.fillStyle = dark;
        ctx.fillRect(gx, iy + 3 + ((gx * 5) % (ih - 6)), 1, 2);
      }
    }
    for (let k = ix + 4; k < ix + iw - 4; k += 11) {
      const ky = iy + 2 + ((k * 7) % Math.max(1, ih - 5));
      ctx.fillStyle = dark;
      ctx.fillRect(k, ky, 2, 2);
      ctx.fillStyle = mid;
      ctx.fillRect(k, ky, 1, 1);
    }
  } else {
    for (let gy = iy + 1; gy < iy + ih - 1; gy += 2) {
      const tone = ((gy - iy) / 2) % 3;
      ctx.fillStyle = tone === 0 ? hi : tone === 1 ? mid : dark;
      ctx.fillRect(ix + 1, gy, Math.max(1, iw - 2), 1);
    }
  }
  ctx.fillStyle = hi;
  ctx.fillRect(ix, iy, iw, 1);
  ctx.fillRect(ix, iy, 1, ih);
  ctx.fillStyle = dark;
  ctx.fillRect(ix, iy + ih - 1, iw, 1);
  ctx.fillRect(ix + iw - 1, iy, 1, ih);
}

/**
 * Organic grease / nicotine stain — dithered blob with soft edge.
 */
export function greaseStain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  deep: string,
  mid: string,
  edge: string,
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  const cx = ix + iw / 2;
  const cy = iy + ih / 2;
  for (let py = iy; py < iy + ih; py++) {
    for (let px_ = ix; px_ < ix + iw; px_++) {
      const nx = (px_ - cx) / (iw / 2);
      const ny = (py - cy) / (ih / 2);
      const d = nx * nx + ny * ny * 0.85 + (((px_ * 3 + py * 7) & 3) * 0.04);
      if (d > 1.05) continue;
      if (d < 0.35) ctx.fillStyle = deep;
      else if (d < 0.7) ctx.fillStyle = mid;
      else if (((px_ ^ py) & 1) === 0) ctx.fillStyle = edge;
      else continue;
      ctx.fillRect(px_, py, 1, 1);
    }
  }
}

/** Sparse fur / fabric speckles for illustrative density. */
export function speckles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  step = 4,
  seed = 0,
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  ctx.fillStyle = color;
  for (let py = iy; py < iy + h; py += step) {
    for (let px_ = ix + ((py + seed) % step); px_ < ix + w; px_ += step) {
      if (((px_ * 13 + py * 17 + seed) & 5) === 0) ctx.fillRect(px_, py, 1, 1);
    }
  }
}
