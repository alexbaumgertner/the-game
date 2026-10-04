/**
 * Mega Drive 8×8 repeating tiles — sky / kremlin / asphalt / wallpaper.
 * Each far parallax layer keeps its own tiny palette (≤4 colors + transparent).
 */

import { px } from './pixelDraw';

export const TILE = 8;

export type TileCell = string | null;
/** Row-major 8×8. */
export type Tile8 = ReadonlyArray<TileCell>;

export interface TilePalette {
  a: string;
  b: string;
  c: string;
  d?: string;
}

/** Build an 8×8 from a palette + digit map (`0` = empty, `1`..`4` = pal slots). */
export function tileFromMap(map: string, pal: TilePalette): Tile8 {
  const cells: TileCell[] = [];
  const colors = [null, pal.a, pal.b, pal.c, pal.d ?? pal.c] as const;
  const clean = map.replace(/\s+/g, '');
  for (let i = 0; i < TILE * TILE; i++) {
    const ch = clean[i] ?? '0';
    const idx = Number(ch);
    cells.push(colors[idx] ?? null);
  }
  return cells;
}

/** Stamp one 8×8 tile at integer origin. */
export function blitTile8(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tile: Tile8,
): void {
  const x0 = Math.round(ox);
  const y0 = Math.round(oy);
  for (let row = 0; row < TILE; row++) {
    for (let col = 0; col < TILE; col++) {
      const c = tile[row * TILE + col];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x0 + col, y0 + row, 1, 1);
    }
  }
}

/**
 * Fill a rect with a repeating 8×8 tile.
 * `scrollX`/`scrollY` shift the pattern (parallax-friendly, integer).
 */
export function fillTileRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tile: Tile8,
  scrollX = 0,
  scrollY = 0,
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  if (iw <= 0 || ih <= 0) return;
  const ox = ((Math.round(scrollX) % TILE) + TILE) % TILE;
  const oy = ((Math.round(scrollY) % TILE) + TILE) % TILE;
  const startCol = Math.floor(-ox / TILE) - 1;
  const startRow = Math.floor(-oy / TILE) - 1;
  const endCol = Math.ceil((iw - ox) / TILE) + 1;
  const endRow = Math.ceil((ih - oy) / TILE) + 1;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      blitTile8(ctx, ix + col * TILE + ox, iy + row * TILE + oy, tile);
    }
  }
  ctx.restore();
}

/* ── Layer palettes (far → near) ── */

export const SKY_PAL: TilePalette = {
  a: '#0c1424',
  b: '#182438',
  c: '#243048',
  d: '#3a5070',
};

export const KREMLIN_PAL: TilePalette = {
  a: '#12161e',
  b: '#1a2030',
  c: '#222838',
  d: '#d8b050',
};

export const HALL_PAL: TilePalette = {
  a: '#2a5088',
  b: '#3a78a8',
  c: '#5888a8',
  d: '#98c8e0',
};

export const ASPHALT_PAL: TilePalette = {
  a: '#3a3c48',
  b: '#484a58',
  c: '#2e3040',
  d: '#5a5c68',
};

export const WALLPAPER_PAL: TilePalette = {
  a: '#585878',
  b: '#6a6890',
  c: '#7a78b0',
  d: '#3c3a58',
};

export const PODEZD_WALL_PAL: TilePalette = {
  a: '#c8b898',
  b: '#b0a080',
  c: '#d8c8a8',
  d: '#908068',
};

/** Night sky — sparse star speckles on deep bands. */
export const TILE_SKY_DEEP = tileFromMap(
  `
  11111111
  11112111
  11111111
  11111111
  11211111
  11111111
  11111121
  11111111
  `,
  SKY_PAL,
);

export const TILE_SKY_MID = tileFromMap(
  `
  22222222
  22223222
  22222222
  22322222
  22222222
  22222232
  22222222
  23222222
  `,
  SKY_PAL,
);

export const TILE_SKY_LOW = tileFromMap(
  `
  33333333
  33334333
  33333333
  33433333
  33333333
  33333343
  33333333
  34333333
  `,
  SKY_PAL,
);

/** Kremlin brick / masonry. */
export const TILE_KREMLIN = tileFromMap(
  `
  11111112
  11111112
  11111112
  22222222
  22111111
  22111111
  22111111
  22222222
  `,
  KREMLIN_PAL,
);

export const TILE_KREMLIN_LIT = tileFromMap(
  `
  22222322
  22222222
  22222222
  33333333
  32222222
  32222422
  32222222
  33333333
  `,
  KREMLIN_PAL,
);

/** Market hall glass / frame. */
export const TILE_HALL_GLASS = tileFromMap(
  `
  11111111
  12222221
  12333321
  12344321
  12344321
  12333321
  12222221
  11111111
  `,
  HALL_PAL,
);

/** Wet asphalt with grit. */
export const TILE_ASPHALT = tileFromMap(
  `
  11121111
  11111131
  13111111
  11111411
  11111111
  41111121
  11131111
  11111111
  `,
  ASPHALT_PAL,
);

export const TILE_ASPHALT_SNOW = tileFromMap(
  `
  22222222
  21222122
  22222222
  22122212
  22222222
  21221222
  22222222
  22122222
  `,
  { a: '#3a3c48', b: '#e0e8f0', c: '#c8d0d8', d: '#a8b0b8' },
);

/** Apartment wallpaper — diamond motif, 8×8. */
export const TILE_WALLPAPER = tileFromMap(
  `
  11112111
  11121211
  11211121
  12111112
  11211121
  11121211
  11112111
  14111111
  `,
  WALLPAPER_PAL,
);

/** Podezd / cream Soviet wallpaper. */
export const TILE_PODEZD_WALL = tileFromMap(
  `
  11113111
  11311131
  13111113
  11111111
  11113111
  11311131
  13111113
  41111111
  `,
  PODEZD_WALL_PAL,
);

/** Convenience: solid band using a tile across full width. */
export function fillTileBand(
  ctx: CanvasRenderingContext2D,
  y: number,
  h: number,
  width: number,
  tile: Tile8,
  scrollX = 0,
): void {
  fillTileRect(ctx, 0, y, width, h, tile, scrollX, 0);
}

/** MD wallpaper fill (replaces noisy photo pattern for 16-bit pass). */
export function drawMdWallpaper(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  variant: 'apt' | 'podezd' = 'apt',
): void {
  fillTileRect(ctx, x, y, w, h, variant === 'podezd' ? TILE_PODEZD_WALL : TILE_WALLPAPER);
  // Soft base under first row for depth
  px(ctx, x, y + h - 1, w, 1, variant === 'podezd' ? PODEZD_WALL_PAL.d! : WALLPAPER_PAL.d!);
}
