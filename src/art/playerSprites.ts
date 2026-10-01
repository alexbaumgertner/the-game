/**
 * Genesis-style multi-tile player sprites — adult (2026) & teen (1995).
 * Taller humanoids, 8–12 colors, idle / walk (4f) / inspect with shading.
 */

import { ADULT_PAL, TEEN_PAL } from './segaPalette';
import { blitGrid } from './pixelDraw';

type Cell = string | null;

const A = ADULT_PAL;
const T = TEEN_PAL;

/** Adult frame size: 16×28 */
const AW = 16;
const AH = 28;

/** Teen frame size: 14×24 */
const TW = 14;
const TH = 24;

function grid(w: number, h: number): Cell[] {
  return Array(w * h).fill(null);
}

function setter(g: Cell[], w: number, h: number) {
  return (x: number, y: number, c: Cell) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    g[y * w + x] = c;
  };
}

function adultIdle(frame: number): Cell[] {
  const bob = frame % 2;
  const g = grid(AW, AH);
  const set = setter(g, AW, AH);
  const hy = bob;

  const o = A.outline;
  const skH = A.skinHi;
  const sk = A.skin;
  const skM = A.skinMid;
  const skS = A.skinShadow;
  const hrH = A.hairHi;
  const hr = A.hair;
  const hrD = A.hairDark;
  const shH = A.shirtHi;
  const sh = A.shirt;
  const shM = A.shirtMid;
  const shD = A.shirtDark;
  const pnH = A.pantsHi;
  const pn = A.pants;
  const pnD = A.pantsDark;
  const shs = A.shoes;
  const shsH = A.shoesHi;
  const bl = A.belt;
  const blD = A.beltDark;

  // Hair mass
  for (let x = 4; x <= 11; x++) set(x, hy, hrD);
  for (let x = 3; x <= 12; x++) set(x, hy + 1, hr);
  for (let x = 2; x <= 13; x++) set(x, hy + 2, hr);
  set(4, hy + 1, hrH);
  set(5, hy + 1, hrH);
  set(10, hy + 2, hrD);

  // Head
  for (let y = 3; y <= 7; y++) {
    for (let x = 4; x <= 11; x++) set(x, hy + y, sk);
  }
  set(3, hy + 4, sk);
  set(3, hy + 5, skM);
  set(12, hy + 4, sk);
  set(12, hy + 5, skS);
  // Cheek / forehead highlight
  set(5, hy + 4, skH);
  set(6, hy + 4, skH);
  set(5, hy + 5, sk);
  // Eyes
  set(5, hy + 5, o);
  set(6, hy + 5, skH);
  set(9, hy + 5, o);
  set(10, hy + 5, skH);
  // Nose / mouth
  set(8, hy + 6, skM);
  set(7, hy + 7, skS);
  set(8, hy + 7, skM);
  // Jaw outline
  set(3, hy + 3, o);
  set(12, hy + 3, o);
  set(3, hy + 6, o);
  set(12, hy + 6, o);

  // Neck
  set(7, hy + 8, sk);
  set(8, hy + 8, skM);

  // Collar
  for (let x = 5; x <= 10; x++) set(x, 9, shD);
  set(6, 9, shH);
  set(7, 9, sh);

  // Torso
  for (let y = 10; y <= 16; y++) {
    for (let x = 4; x <= 11; x++) {
      const edge = x === 4 || x === 11;
      set(x, y, edge ? shD : y === 16 ? shM : sh);
    }
  }
  // Shirt highlight stripe
  for (let y = 11; y <= 14; y++) set(6, y, shH);
  set(7, 11, shH);
  // Buttons
  set(8, 12, bl);
  set(8, 14, bl);

  // Arms
  set(2, 10, sk);
  set(2, 11, sk);
  set(2, 12, skM);
  set(2, 13, skS);
  set(1, 11, sk);
  set(1, 12, skM);
  set(13, 10, sk);
  set(13, 11, sk);
  set(13, 12, skM);
  set(13, 13, skS);
  set(14, 11, sk);
  set(14, 12, skM);
  // Sleeve cuffs
  set(3, 10, sh);
  set(3, 11, shM);
  set(12, 10, sh);
  set(12, 11, shM);

  // Belt
  for (let x = 4; x <= 11; x++) set(x, 17, blD);
  set(7, 17, bl);
  set(8, 17, bl);

  // Legs
  for (let y = 18; y <= 23; y++) {
    set(5, y, pnH);
    set(6, y, pn);
    set(7, y, pnD);
    set(8, y, pn);
    set(9, y, pn);
    set(10, y, pnD);
  }
  // Knees
  set(6, 20, pnH);
  set(9, 20, pnH);

  // Shoes
  for (let x = 4; x <= 7; x++) {
    set(x, 24, shs);
    set(x, 25, shs);
  }
  for (let x = 8; x <= 11; x++) {
    set(x, 24, shs);
    set(x, 25, shs);
  }
  set(4, 24, shsH);
  set(8, 24, shsH);
  set(3, 25, shs);
  set(12, 25, shs);
  set(5, 26, shs);
  set(6, 26, shs);
  set(9, 26, shs);
  set(10, 26, shs);

  return g;
}

function adultWalk(frame: number): Cell[] {
  const g = adultIdle(0);
  const set = setter(g, AW, AH);
  const pnH = A.pantsHi;
  const pn = A.pants;
  const pnD = A.pantsDark;
  const shs = A.shoes;
  const shsH = A.shoesHi;
  const sk = A.skin;
  const skM = A.skinMid;
  const sh = A.shirt;
  const shM = A.shirtMid;

  // Clear legs / shoes / arms for stride
  for (let y = 10; y < AH; y++) {
    for (let x = 0; x < AW; x++) {
      if (y >= 18 || x <= 3 || x >= 12) g[y * AW + x] = null;
    }
  }
  // Restore belt
  for (let x = 4; x <= 11; x++) set(x, 17, A.beltDark);
  set(7, 17, A.belt);
  set(8, 17, A.belt);

  const f = frame % 4;
  const stride = [
    // 0: left forward
    () => {
      set(3, 18, pn); set(4, 18, pnH); set(5, 18, pn);
      set(3, 19, pn); set(4, 19, pn); set(5, 19, pnD);
      set(2, 20, pn); set(3, 20, pn); set(4, 20, pn);
      set(2, 21, pn); set(3, 21, pnD);
      set(1, 22, shs); set(2, 22, shsH); set(3, 22, shs);
      set(1, 23, shs); set(2, 23, shs);
      set(8, 18, pnD); set(9, 18, pn); set(10, 18, pn);
      set(9, 19, pn); set(10, 19, pn); set(11, 19, pnD);
      set(10, 20, pn); set(11, 20, pn);
      set(11, 21, pn); set(12, 21, pnD);
      set(11, 22, shs); set(12, 22, shsH); set(13, 22, shs);
      set(12, 23, shs); set(13, 23, shs);
      set(1, 10, sk); set(1, 11, sk); set(0, 12, skM); set(0, 13, skM);
      set(14, 10, sk); set(14, 11, skM); set(15, 12, skM); set(15, 13, sk);
      set(3, 10, sh); set(12, 10, shM);
    },
    // 1: mid / contact
    () => {
      set(5, 18, pnH); set(6, 18, pn); set(7, 18, pnD);
      set(5, 19, pn); set(6, 19, pn); set(7, 19, pnD);
      set(5, 20, pn); set(6, 20, pnH); set(7, 20, pn);
      set(5, 21, pn); set(6, 21, pn); set(7, 21, pnD);
      set(4, 22, shs); set(5, 22, shsH); set(6, 22, shs); set(7, 22, shs);
      set(4, 23, shs); set(7, 23, shs);
      set(8, 18, pn); set(9, 18, pn); set(10, 18, pnD);
      set(8, 19, pn); set(9, 19, pnH); set(10, 19, pn);
      set(8, 20, pnD); set(9, 20, pn); set(10, 20, pn);
      set(8, 21, pn); set(9, 21, pn); set(10, 21, pnD);
      set(8, 22, shs); set(9, 22, shsH); set(10, 22, shs); set(11, 22, shs);
      set(8, 23, shs); set(11, 23, shs);
      set(2, 10, sk); set(2, 11, sk); set(2, 12, skM);
      set(13, 10, sk); set(13, 11, sk); set(13, 12, skM);
    },
    // 2: right forward
    () => {
      set(8, 18, pn); set(9, 18, pnH); set(10, 18, pn);
      set(9, 19, pn); set(10, 19, pn); set(11, 19, pnD);
      set(10, 20, pn); set(11, 20, pn); set(12, 20, pn);
      set(11, 21, pn); set(12, 21, pnD);
      set(11, 22, shs); set(12, 22, shsH); set(13, 22, shs);
      set(12, 23, shs); set(13, 23, shs);
      set(3, 18, pnD); set(4, 18, pn); set(5, 18, pn);
      set(3, 19, pn); set(4, 19, pn); set(2, 19, pnD);
      set(2, 20, pn); set(3, 20, pn);
      set(1, 21, pn); set(2, 21, pnD);
      set(1, 22, shs); set(2, 22, shsH); set(3, 22, shs);
      set(1, 23, shs); set(2, 23, shs);
      set(0, 10, sk); set(0, 11, skM); set(1, 12, skM);
      set(14, 10, sk); set(15, 11, sk); set(15, 12, skM); set(15, 13, sk);
      set(3, 10, shM); set(12, 10, sh);
    },
    // 3: mid opposite
    () => {
      set(5, 18, pn); set(6, 18, pnH); set(7, 18, pn);
      set(5, 19, pnD); set(6, 19, pn); set(7, 19, pn);
      set(5, 20, pn); set(6, 20, pn); set(7, 20, pnD);
      set(5, 21, pn); set(6, 21, pnH); set(7, 21, pn);
      set(4, 22, shs); set(5, 22, shs); set(6, 22, shsH); set(7, 22, shs);
      set(4, 23, shs); set(7, 23, shs);
      set(8, 18, pnH); set(9, 18, pn); set(10, 18, pnD);
      set(8, 19, pn); set(9, 19, pn); set(10, 19, pn);
      set(8, 20, pn); set(9, 20, pnH); set(10, 20, pn);
      set(8, 21, pnD); set(9, 21, pn); set(10, 21, pn);
      set(8, 22, shs); set(9, 22, shs); set(10, 22, shsH); set(11, 22, shs);
      set(8, 23, shs); set(11, 23, shs);
      set(2, 10, sk); set(1, 11, sk); set(1, 12, skM);
      set(13, 10, sk); set(14, 11, sk); set(14, 12, skM);
    },
  ];
  stride[f]!();
  return g;
}

function adultInspect(frame: number): Cell[] {
  const g = adultIdle(frame % 2);
  const set = setter(g, AW, AH);
  const sk = A.skin;
  const skM = A.skinMid;
  const skH = A.skinHi;
  const sh = A.shirt;
  const o = A.outline;

  // Clear right arm, reach forward/up
  for (let y = 9; y <= 14; y++) {
    set(12, y, null);
    set(13, y, null);
    set(14, y, null);
  }
  set(12, 9, sh);
  set(13, 8, sk);
  set(14, 7, sk);
  set(15, 6, skH);
  set(15, 5, sk);
  set(14, 5, o);
  set(15, 7, skM);
  if (frame % 2 === 1) {
    set(15, 4, skH);
    set(14, 4, o);
  }
  return g;
}

function teenIdle(frame: number): Cell[] {
  const bob = frame % 2;
  const g = grid(TW, TH);
  const set = setter(g, TW, TH);
  const hy = bob;

  const o = T.outline;
  const skH = T.skinHi;
  const sk = T.skin;
  const skM = T.skinMid;
  const skS = T.skinShadow;
  const hrH = T.hairHi;
  const hr = T.hair;
  const hrD = T.hairDark;
  const shH = T.shirtHi;
  const sh = T.shirt;
  const shM = T.shirtMid;
  const shD = T.shirtDark;
  const pnH = T.pantsHi;
  const pn = T.pants;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;
  const scH = T.scarfHi;
  const sc = T.scarf;
  const scD = T.scarfDark;

  // Hair
  for (let x = 3; x <= 10; x++) set(x, hy, hrD);
  for (let x = 2; x <= 11; x++) set(x, hy + 1, hr);
  set(4, hy + 1, hrH);
  set(5, hy + 1, hrH);

  // Head
  for (let y = 2; y <= 5; y++) {
    for (let x = 3; x <= 10; x++) set(x, hy + y, sk);
  }
  set(2, hy + 3, sk);
  set(11, hy + 3, skM);
  set(4, hy + 3, skH);
  set(5, hy + 3, o);
  set(6, hy + 3, skH);
  set(8, hy + 3, o);
  set(9, hy + 3, skH);
  set(7, hy + 4, skM);
  set(6, hy + 5, skS);
  set(7, hy + 5, skM);

  // Scarf
  for (let x = 3; x <= 10; x++) set(x, hy + 6, sc);
  set(2, hy + 6, scD);
  set(4, hy + 6, scH);
  set(5, hy + 6, scH);
  set(11, hy + 7, sc);
  set(12, hy + 8, scD);
  set(12, hy + 9, sc);

  // Coat torso
  for (let y = 7; y <= 13; y++) {
    for (let x = 3; x <= 10; x++) {
      set(x, y, y === 13 ? shD : x === 3 || x === 10 ? shM : sh);
    }
  }
  for (let y = 8; y <= 11; y++) set(5, y, shH);
  set(6, 8, shH);
  // Zipper
  set(7, 9, T.outline);
  set(7, 11, T.outline);

  // Arms
  set(1, 8, sk);
  set(1, 9, sk);
  set(1, 10, skM);
  set(0, 9, sk);
  set(12, 8, sk);
  set(12, 9, sk);
  set(12, 10, skM);
  set(13, 9, sk);
  set(2, 8, sh);
  set(11, 8, sh);

  // Legs
  for (let y = 14; y <= 18; y++) {
    set(4, y, pnH);
    set(5, y, pn);
    set(6, y, pnD);
    set(7, y, pn);
    set(8, y, pn);
    set(9, y, pnD);
  }
  set(5, 16, pnH);
  set(8, 16, pnH);

  // Shoes
  for (let x = 3; x <= 6; x++) {
    set(x, 19, shs);
    set(x, 20, shs);
  }
  for (let x = 7; x <= 10; x++) {
    set(x, 19, shs);
    set(x, 20, shs);
  }
  set(3, 19, shsH);
  set(7, 19, shsH);
  set(2, 20, shs);
  set(11, 20, shs);
  set(4, 21, shs);
  set(5, 21, shs);
  set(8, 21, shs);
  set(9, 21, shs);

  return g;
}

function teenWalk(frame: number): Cell[] {
  const g = teenIdle(0);
  const set = setter(g, TW, TH);
  const pnH = T.pantsHi;
  const pn = T.pants;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;
  const sk = T.skin;
  const skM = T.skinMid;
  const sh = T.shirt;

  for (let y = 8; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      if (y >= 14 || x <= 2 || x >= 11) g[y * TW + x] = null;
    }
  }

  const f = frame % 4;
  if (f === 0 || f === 1) {
    set(2, 14, pn); set(3, 14, pnH); set(4, 14, pn);
    set(2, 15, pn); set(3, 15, pn); set(4, 15, pnD);
    set(1, 16, pn); set(2, 16, pn);
    set(1, 17, pnD); set(2, 17, pn);
    set(0, 18, shs); set(1, 18, shsH); set(2, 18, shs);
    set(0, 19, shs); set(1, 19, shs);
    set(7, 14, pnD); set(8, 14, pn); set(9, 14, pn);
    set(8, 15, pn); set(9, 15, pn); set(10, 15, pnD);
    set(9, 16, pn); set(10, 16, pn);
    set(10, 17, pn); set(11, 17, pnD);
    set(10, 18, shs); set(11, 18, shsH); set(12, 18, shs);
    set(11, 19, shs); set(12, 19, shs);
    set(1, 8, sk); set(0, 9, sk); set(0, 10, skM);
    set(12, 8, sk); set(13, 9, sk); set(13, 10, skM);
    set(2, 8, sh); set(11, 8, sh);
  } else {
    set(7, 14, pn); set(8, 14, pnH); set(9, 14, pn);
    set(8, 15, pn); set(9, 15, pn); set(10, 15, pnD);
    set(9, 16, pn); set(10, 16, pn);
    set(10, 17, pnD); set(11, 17, pn);
    set(10, 18, shs); set(11, 18, shsH); set(12, 18, shs);
    set(11, 19, shs); set(12, 19, shs);
    set(2, 14, pnD); set(3, 14, pn); set(4, 14, pn);
    set(2, 15, pn); set(3, 15, pn); set(1, 15, pnD);
    set(1, 16, pn); set(2, 16, pn);
    set(0, 17, pn); set(1, 17, pnD);
    set(0, 18, shs); set(1, 18, shsH); set(2, 18, shs);
    set(0, 19, shs); set(1, 19, shs);
    set(0, 8, sk); set(0, 9, skM); set(1, 10, skM);
    set(12, 8, sk); set(13, 9, sk); set(12, 10, skM);
    set(2, 8, sh); set(11, 8, sh);
  }
  if (f === 1 || f === 3) {
    // Mid-step slight lift
    set(5, 14, pnH);
    set(6, 14, pn);
  }
  return g;
}

function teenRun(frame: number): Cell[] {
  const g = teenWalk(frame);
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const sc = T.scarf;
  set(13, 6, sc);
  set(13, 7, T.scarfDark);
  if (frame % 2 === 0) {
    set(0, 7, sk);
    set(13, 10, sk);
  } else {
    set(13, 7, sk);
    set(0, 10, sk);
  }
  return g;
}

function teenInspect(frame: number): Cell[] {
  const g = teenIdle(frame % 2);
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const skH = T.skinHi;
  const o = T.outline;

  set(12, 8, null);
  set(12, 9, null);
  set(12, 10, null);
  set(13, 9, null);
  set(11, 7, sk);
  set(12, 6, sk);
  set(13, 5, skH);
  set(13, 4, sk);
  set(12, 4, o);
  if (frame % 2 === 1) set(13, 3, skH);
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
  x: number,
  y: number,
  facing: 1 | -1,
): void {
  let cells: Cell[];
  let w: number;
  let h: number;

  switch (kind) {
    case 'adult_idle':
      cells = adultIdle(frame);
      w = AW;
      h = AH;
      break;
    case 'adult_walk':
      cells = adultWalk(frame);
      w = AW;
      h = AH;
      break;
    case 'adult_inspect':
      cells = adultInspect(frame);
      w = AW;
      h = AH;
      break;
    case 'teen_idle':
      cells = teenIdle(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_walk':
      cells = teenWalk(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_run':
      cells = teenRun(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_inspect':
      cells = teenInspect(frame);
      w = TW;
      h = TH;
      break;
    default:
      cells = adultIdle(0);
      w = AW;
      h = AH;
  }

  const ox = Math.round(x);
  const oy = Math.round(y);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(facing, 1);
  blitGrid(ctx, -Math.floor(w / 2), -h, w, h, cells, 1);
  ctx.restore();
}

export const SPRITE_SIZES = {
  adult: { w: AW, h: AH },
  teen: { w: TW, h: TH },
} as const;
