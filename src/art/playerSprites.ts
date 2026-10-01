/**
 * Multi-tile NES player sprites — adult (2026) & teen (1995).
 * Procedural grids: head / torso / legs, idle·walk·inspect (adult) / idle·walk·run (teen).
 */

import { ADULT_PAL, TEEN_PAL } from './nesPalette';
import { blitGrid } from './pixelDraw';

type Cell = string | null;

const A = ADULT_PAL;
const T = TEEN_PAL;

/** Adult frame size: 12×20 */
const AW = 12;
const AH = 20;

/** Teen frame size: 10×16 */
const TW = 10;
const TH = 16;

function adultIdle(frame: number): Cell[] {
  const bob = frame % 2;
  const o = A.outline;
  const sk = A.skin;
  const ss = A.skinShadow;
  const hr = A.hair;
  const sh = A.shirt;
  const sd = A.shirtDark;
  const pn = A.pants;
  const pd = A.pantsDark;
  const shs = A.shoes;

  // Build empty grid
  const g: Cell[] = Array(AW * AH).fill(null);
  const set = (x: number, y: number, c: Cell) => {
    if (x < 0 || x >= AW || y < 0 || y >= AH) return;
    g[y * AW + x] = c;
  };

  const hy = bob; // head bob 0/1

  // Hair
  for (let x = 3; x <= 8; x++) set(x, hy + 0, hr);
  for (let x = 2; x <= 9; x++) set(x, hy + 1, hr);
  // Head
  for (let y = 2; y <= 5; y++) for (let x = 3; x <= 8; x++) set(x, hy + y, sk);
  set(2, hy + 3, sk);
  set(9, hy + 3, sk);
  set(2, hy + 4, ss);
  set(9, hy + 4, ss);
  // Eyes + nose
  set(4, hy + 3, o);
  set(7, hy + 3, o);
  set(6, hy + 4, ss);
  // Outline
  for (let x = 3; x <= 8; x++) if (!g[(hy + 0) * AW + x]) set(x, hy + 0, o);
  set(2, hy + 2, o);
  set(9, hy + 2, o);

  // Neck
  set(5, hy + 6, sk);
  set(6, hy + 6, sk);

  // Torso (shirt)
  for (let y = 7; y <= 12; y++) {
    for (let x = 3; x <= 8; x++) set(x, y, y === 12 ? sd : sh);
  }
  set(2, 8, sh);
  set(2, 9, sh);
  set(9, 8, sh);
  set(9, 9, sh);
  set(4, 8, sd);
  set(5, 8, sd); // collar shadow

  // Arms
  set(1, 8, sk);
  set(1, 9, sk);
  set(1, 10, sk);
  set(10, 8, sk);
  set(10, 9, sk);
  set(10, 10, sk);

  // Belt
  for (let x = 3; x <= 8; x++) set(x, 13, pd);

  // Legs
  for (let y = 14; y <= 17; y++) {
    set(4, y, pn);
    set(5, y, pn);
    set(6, y, pd);
    set(7, y, pn);
  }
  // Shoes
  set(3, 18, shs);
  set(4, 18, shs);
  set(5, 18, shs);
  set(6, 18, shs);
  set(7, 18, shs);
  set(8, 18, shs);
  set(3, 19, shs);
  set(8, 19, shs);

  return g;
}

function adultWalk(frame: number): Cell[] {
  const g = adultIdle(0);
  const pn = A.pants;
  const pd = A.pantsDark;
  const shs = A.shoes;
  const sk = A.skin;
  const set = (x: number, y: number, c: Cell) => {
    g[y * AW + x] = c;
  };
  // Clear legs/shoes/arms and redraw stride
  for (let y = 8; y < AH; y++) {
    for (let x = 0; x < AW; x++) {
      if (y >= 14 || x <= 1 || x >= 10) g[y * AW + x] = null;
    }
  }
  // Restoring belt
  for (let x = 3; x <= 8; x++) set(x, 13, pd);

  const f = frame % 2;
  if (f === 0) {
    // Left leg forward
    set(3, 14, pn);
    set(4, 14, pn);
    set(3, 15, pn);
    set(4, 15, pn);
    set(2, 16, pn);
    set(3, 16, pn);
    set(2, 17, shs);
    set(3, 17, shs);
    set(1, 18, shs);
    set(2, 18, shs);
    // Right leg back
    set(6, 14, pd);
    set(7, 14, pn);
    set(7, 15, pn);
    set(8, 15, pn);
    set(7, 16, pn);
    set(8, 16, pn);
    set(8, 17, shs);
    set(9, 17, shs);
    set(8, 18, shs);
    set(9, 18, shs);
    // Swing arms
    set(1, 8, sk);
    set(0, 9, sk);
    set(0, 10, sk);
    set(10, 8, sk);
    set(10, 9, sk);
    set(11, 10, sk);
  } else {
    // Opposite stride
    set(6, 14, pn);
    set(7, 14, pn);
    set(7, 15, pn);
    set(8, 15, pn);
    set(8, 16, pn);
    set(9, 16, pn);
    set(8, 17, shs);
    set(9, 17, shs);
    set(9, 18, shs);
    set(10, 18, shs);
    set(3, 14, pd);
    set(4, 14, pn);
    set(2, 15, pn);
    set(3, 15, pn);
    set(2, 16, pn);
    set(3, 16, pn);
    set(1, 17, shs);
    set(2, 17, shs);
    set(1, 18, shs);
    set(2, 18, shs);
    set(1, 8, sk);
    set(1, 9, sk);
    set(0, 10, sk);
    set(10, 8, sk);
    set(11, 9, sk);
    set(11, 10, sk);
  }
  return g;
}

function adultInspect(frame: number): Cell[] {
  void frame;
  const g = adultIdle(0);
  const sk = A.skin;
  const sh = A.shirt;
  const o = A.outline;
  const set = (x: number, y: number, c: Cell) => {
    g[y * AW + x] = c;
  };
  // Reach arm forward
  for (let x = 9; x <= 11; x++) {
    set(x, 8, null);
    set(x, 9, null);
    set(x, 10, null);
  }
  set(9, 7, sh);
  set(10, 7, sk);
  set(11, 7, sk);
  set(11, 6, sk);
  set(10, 6, o); // hand outline
  // Slight lean / head tilt already from idle
  return g;
}

function teenIdle(frame: number): Cell[] {
  const bob = frame % 2;
  const o = T.outline;
  const sk = T.skin;
  const ss = T.skinShadow;
  const hr = T.hair;
  const sh = T.shirt;
  const sd = T.shirtDark;
  const pn = T.pants;
  const pd = T.pantsDark;
  const shs = T.shoes;
  const sc = T.scarf;

  const g: Cell[] = Array(TW * TH).fill(null);
  const set = (x: number, y: number, c: Cell) => {
    if (x < 0 || x >= TW || y < 0 || y >= TH) return;
    g[y * TW + x] = c;
  };
  const hy = bob;

  // Hair (shorter teen cut)
  for (let x = 2; x <= 7; x++) set(x, hy, hr);
  for (let x = 1; x <= 8; x++) set(x, hy + 1, hr);
  // Head
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 7; x++) set(x, hy + y, sk);
  set(3, hy + 3, o);
  set(6, hy + 3, o);
  set(5, hy + 4, ss);
  // Scarf
  for (let x = 2; x <= 7; x++) set(x, hy + 5, sc);
  set(1, hy + 5, sc);
  set(8, hy + 6, sc); // trailing end

  // Torso
  for (let y = 6; y <= 9; y++) for (let x = 2; x <= 7; x++) set(x, y, y === 9 ? sd : sh);
  set(1, 7, sk);
  set(8, 7, sk);
  set(1, 8, sk);
  set(8, 8, sk);

  // Legs
  for (let y = 10; y <= 13; y++) {
    set(3, y, pn);
    set(4, y, pn);
    set(5, y, pd);
    set(6, y, pn);
  }
  set(2, 14, shs);
  set(3, 14, shs);
  set(4, 14, shs);
  set(5, 14, shs);
  set(6, 14, shs);
  set(7, 14, shs);
  set(2, 15, shs);
  set(7, 15, shs);

  return g;
}

function teenWalk(frame: number): Cell[] {
  const g = teenIdle(0);
  const pn = T.pants;
  const pd = T.pantsDark;
  const shs = T.shoes;
  const sk = T.skin;
  const set = (x: number, y: number, c: Cell) => {
    g[y * TW + x] = c;
  };
  for (let y = 7; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      if (y >= 10 || x <= 1 || x >= 8) g[y * TW + x] = null;
    }
  }
  const f = frame % 2;
  if (f === 0) {
    set(2, 10, pn);
    set(3, 10, pn);
    set(2, 11, pn);
    set(1, 12, pn);
    set(1, 13, shs);
    set(0, 14, shs);
    set(5, 10, pd);
    set(6, 10, pn);
    set(6, 11, pn);
    set(7, 12, pn);
    set(7, 13, shs);
    set(8, 14, shs);
    set(1, 7, sk);
    set(0, 8, sk);
    set(8, 7, sk);
    set(9, 8, sk);
  } else {
    set(5, 10, pn);
    set(6, 10, pn);
    set(6, 11, pn);
    set(7, 12, pn);
    set(8, 13, shs);
    set(8, 14, shs);
    set(2, 10, pd);
    set(3, 10, pn);
    set(2, 11, pn);
    set(1, 12, pn);
    set(1, 13, shs);
    set(0, 14, shs);
    set(0, 7, sk);
    set(1, 8, sk);
    set(8, 7, sk);
    set(8, 8, sk);
  }
  return g;
}

function teenRun(frame: number): Cell[] {
  // Longer stride / lean — reuse walk with more extension
  const g = teenWalk(frame);
  const sk = T.skin;
  const set = (x: number, y: number, c: Cell) => {
    if (x >= 0 && x < TW && y >= 0 && y < TH) g[y * TW + x] = c;
  };
  // Forward lean: shift scarf trail
  set(9, 5, T.scarf);
  set(0, 6, null);
  // Arms more pumped
  if (frame % 2 === 0) {
    set(0, 6, sk);
    set(9, 8, sk);
  } else {
    set(9, 6, sk);
    set(0, 8, sk);
  }
  return g;
}

function teenInspect(frame: number): Cell[] {
  void frame;
  const g = teenIdle(0);
  const sk = T.skin;
  const set = (x: number, y: number, c: Cell) => {
    g[y * TW + x] = c;
  };
  set(8, 7, null);
  set(8, 8, null);
  set(8, 6, sk);
  set(9, 6, sk);
  set(9, 5, sk);
  return g;
}

export type PlayerSpriteKind =
  | 'adult_idle'
  | 'adult_walk'
  | 'adult_inspect'
  | 'teen_idle'
  | 'teen_walk'
  | 'teen_run'
  | 'teen_inspect';

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  kind: PlayerSpriteKind,
  frame: number,
  x: number, // feet center
  y: number,
  facing: 1 | -1,
): void {
  let grid: Cell[];
  let w: number;
  let h: number;

  switch (kind) {
    case 'adult_idle':
      grid = adultIdle(frame);
      w = AW;
      h = AH;
      break;
    case 'adult_walk':
      grid = adultWalk(frame);
      w = AW;
      h = AH;
      break;
    case 'adult_inspect':
      grid = adultInspect(frame);
      w = AW;
      h = AH;
      break;
    case 'teen_idle':
      grid = teenIdle(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_walk':
      grid = teenWalk(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_run':
      grid = teenRun(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_inspect':
      grid = teenInspect(frame);
      w = TW;
      h = TH;
      break;
    default:
      grid = adultIdle(0);
      w = AW;
      h = AH;
  }

  const ox = Math.round(x);
  const oy = Math.round(y);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(facing, 1);
  blitGrid(ctx, -Math.floor(w / 2), -h, w, h, grid, 1);
  ctx.restore();
}
