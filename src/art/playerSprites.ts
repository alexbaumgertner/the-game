/**
 * Neo-Noir fluid player sprites — 32–48px layouts, sub-stepped clips.
 * Adult 2026: 32×44 · Teen 1995: 28×40
 * Crisp blit via blitGrid (imageSmoothingEnabled = false upstream).
 */

import { ADULT_PAL, TEEN_PAL } from './segaPalette';
import { blitGrid } from './pixelDraw';

type Cell = string | null;

const A = ADULT_PAL;
const T = TEEN_PAL;

/** Adult frame: 32×44 (within 32–48 budget). */
const AW = 32;
const AH = 44;

/** Teen frame: 28×40. */
const TW = 28;
const TH = 40;

function grid(w: number, h: number): Cell[] {
  return Array(w * h).fill(null);
}

function setter(g: Cell[], w: number, h: number) {
  return (x: number, y: number, c: Cell) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    g[y * w + x] = c;
  };
}

function fillRect(
  set: (x: number, y: number, c: Cell) => void,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: Cell,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) set(x, y, c);
  }
}

/* ───────────────────────── Adult 2026 ───────────────────────── */

function adultIdle(frame: number): Cell[] {
  // 4-frame breathing: chest + shoulder lift
  const breath = [0, 1, 1, 0][frame % 4]!;
  const g = grid(AW, AH);
  const set = setter(g, AW, AH);
  const hy = breath;

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

  // Hair
  fillRect(set, 10, hy, 21, hy, hrD);
  fillRect(set, 8, hy + 1, 23, hy + 2, hr);
  fillRect(set, 7, hy + 2, 24, hy + 3, hr);
  set(10, hy + 1, hrH);
  set(11, hy + 1, hrH);
  set(12, hy + 2, hrH);
  set(20, hy + 2, hrD);

  // Head
  fillRect(set, 10, hy + 4, 21, hy + 11, sk);
  fillRect(set, 9, hy + 6, 9, hy + 9, skM);
  fillRect(set, 22, hy + 6, 22, hy + 9, skS);
  set(12, hy + 6, skH);
  set(13, hy + 6, skH);
  set(12, hy + 7, skH);
  // Eyes
  set(12, hy + 8, o);
  set(13, hy + 8, skH);
  set(18, hy + 8, o);
  set(19, hy + 8, skH);
  set(15, hy + 9, skM);
  set(14, hy + 10, skS);
  set(15, hy + 10, skM);
  set(16, hy + 10, skM);
  // Jaw outline
  set(9, hy + 5, o);
  set(22, hy + 5, o);
  set(9, hy + 10, o);
  set(22, hy + 10, o);

  // Neck
  set(14, hy + 12, sk);
  set(15, hy + 12, sk);
  set(16, hy + 12, skM);
  set(17, hy + 12, skM);

  // Collar / torso (breath raises shoulders)
  const ty = 14;
  fillRect(set, 11, ty, 20, ty, shD);
  set(13, ty, shH);
  set(14, ty, sh);
  fillRect(set, 10, ty + 1, 21, ty + 11 + breath, sh);
  for (let y = ty + 1; y <= ty + 10; y++) {
    set(10, y, shD);
    set(21, y, shD);
  }
  for (let y = ty + 2; y <= ty + 8; y++) set(13, y, shH);
  set(14, ty + 2, shH);
  set(15, ty + 4, bl);
  set(15, ty + 7, bl);

  // Arms hang
  fillRect(set, 6, ty + 1, 8, ty + 8, sk);
  set(5, ty + 3, sk);
  set(5, ty + 4, skM);
  set(6, ty + 9, skM);
  set(7, ty + 9, skS);
  fillRect(set, 23, ty + 1, 25, ty + 8, sk);
  set(26, ty + 3, sk);
  set(26, ty + 4, skM);
  set(24, ty + 9, skM);
  set(25, ty + 9, skS);
  set(9, ty + 1, sh);
  set(9, ty + 2, shM);
  set(22, ty + 1, sh);
  set(22, ty + 2, shM);

  // Belt
  fillRect(set, 10, 27, 21, 27, blD);
  set(14, 27, bl);
  set(15, 27, bl);
  set(16, 27, bl);

  // Legs
  for (let y = 28; y <= 36; y++) {
    set(12, y, pnH);
    set(13, y, pn);
    set(14, y, pnD);
    set(15, y, pn);
    set(16, y, pn);
    set(17, y, pn);
    set(18, y, pnD);
    set(19, y, pn);
  }
  set(13, 32, pnH);
  set(17, 32, pnH);

  // Shoes
  fillRect(set, 10, 37, 15, 39, shs);
  fillRect(set, 16, 37, 21, 39, shs);
  set(10, 37, shsH);
  set(16, 37, shsH);
  set(9, 39, shs);
  set(22, 39, shs);
  fillRect(set, 11, 40, 14, 41, shs);
  fillRect(set, 17, 40, 20, 41, shs);

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
  for (let y = 15; y < AH; y++) {
    for (let x = 0; x < AW; x++) {
      if (y >= 28 || x <= 9 || x >= 22) g[y * AW + x] = null;
    }
  }
  fillRect(set, 10, 27, 21, 27, A.beltDark);
  set(14, 27, A.belt);
  set(15, 27, A.belt);
  set(16, 27, A.belt);

  const f = frame % 6;
  const poses: Array<() => void> = [
    () => {
      // Left plant forward
      fillRect(set, 6, 28, 12, 33, pn);
      set(7, 28, pnH);
      fillRect(set, 5, 34, 10, 36, pnD);
      fillRect(set, 4, 37, 10, 39, shs);
      set(4, 37, shsH);
      fillRect(set, 17, 28, 22, 32, pn);
      set(18, 28, pnH);
      fillRect(set, 20, 33, 24, 36, pnD);
      fillRect(set, 21, 37, 26, 39, shs);
      set(21, 37, shsH);
      fillRect(set, 3, 15, 6, 22, sk);
      set(2, 18, skM);
      fillRect(set, 25, 15, 28, 22, sk);
      set(29, 18, skM);
      set(9, 15, sh);
      set(22, 15, shM);
    },
    () => {
      fillRect(set, 8, 28, 13, 34, pn);
      set(9, 28, pnH);
      fillRect(set, 7, 35, 12, 37, pn);
      fillRect(set, 6, 38, 12, 40, shs);
      set(6, 38, shsH);
      fillRect(set, 16, 28, 21, 34, pn);
      set(17, 28, pnH);
      fillRect(set, 18, 35, 23, 37, pnD);
      fillRect(set, 19, 38, 25, 40, shs);
      set(19, 38, shsH);
      fillRect(set, 5, 15, 7, 21, sk);
      fillRect(set, 24, 15, 26, 21, sk);
    },
    () => {
      // Contact
      fillRect(set, 11, 28, 14, 36, pn);
      set(12, 28, pnH);
      fillRect(set, 10, 37, 15, 39, shs);
      set(10, 37, shsH);
      fillRect(set, 17, 28, 20, 36, pn);
      set(18, 28, pnH);
      fillRect(set, 16, 37, 21, 39, shs);
      set(16, 37, shsH);
      fillRect(set, 6, 15, 8, 22, sk);
      fillRect(set, 23, 15, 25, 22, sk);
    },
    () => {
      // Mirror of 0
      fillRect(set, 17, 28, 23, 33, pn);
      set(18, 28, pnH);
      fillRect(set, 19, 34, 24, 36, pnD);
      fillRect(set, 20, 37, 26, 39, shs);
      set(20, 37, shsH);
      fillRect(set, 7, 28, 12, 32, pn);
      set(8, 28, pnH);
      fillRect(set, 5, 33, 9, 36, pnD);
      fillRect(set, 4, 37, 9, 39, shs);
      set(4, 37, shsH);
      fillRect(set, 3, 15, 6, 22, sk);
      set(2, 18, skM);
      fillRect(set, 25, 15, 28, 22, sk);
      set(29, 18, skM);
      set(9, 15, shM);
      set(22, 15, sh);
    },
    () => {
      fillRect(set, 16, 28, 21, 34, pn);
      set(17, 28, pnH);
      fillRect(set, 18, 35, 23, 37, pn);
      fillRect(set, 19, 38, 25, 40, shs);
      set(19, 38, shsH);
      fillRect(set, 8, 28, 13, 34, pn);
      set(9, 28, pnH);
      fillRect(set, 7, 35, 12, 37, pnD);
      fillRect(set, 6, 38, 12, 40, shs);
      set(6, 38, shsH);
      fillRect(set, 5, 15, 7, 21, sk);
      fillRect(set, 24, 15, 26, 21, sk);
    },
    () => {
      fillRect(set, 11, 28, 14, 36, pn);
      set(12, 32, pnH);
      fillRect(set, 10, 37, 15, 39, shs);
      fillRect(set, 17, 28, 20, 36, pn);
      set(18, 32, pnH);
      fillRect(set, 16, 37, 21, 39, shs);
      fillRect(set, 6, 15, 8, 22, sk);
      fillRect(set, 23, 15, 25, 22, sk);
    },
  ];
  poses[f]!();
  return g;
}

function adultInspect(frame: number): Cell[] {
  const g = adultIdle(frame % 4);
  const set = setter(g, AW, AH);
  const sk = A.skin;
  const skM = A.skinMid;
  const skH = A.skinHi;
  const sh = A.shirt;
  const o = A.outline;

  // Clear right arm, reach forward/up (hand inspect)
  for (let y = 14; y <= 24; y++) {
    for (let x = 22; x <= 28; x++) set(x, y, null);
  }
  const reach = frame % 4;
  set(22, 14, sh);
  set(23, 13, sk);
  set(24, 12 - Math.min(1, reach), sk);
  set(25, 11 - Math.min(2, reach), skH);
  set(26, 10 - Math.min(2, reach), sk);
  set(27, 9 - Math.min(1, reach), skH);
  set(26, 9 - Math.min(1, reach), o);
  set(27, 11 - Math.min(1, reach), skM);
  if (reach >= 2) {
    set(28, 8, skH);
    set(27, 8, o);
  }
  return g;
}

/* ───────────────────────── Teen 1995 ───────────────────────── */

function teenBase(hy: number, lean = 0): Cell[] {
  const g = grid(TW, TH);
  const set = setter(g, TW, TH);

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

  const lx = lean; // forward lean for sprint

  // Hair
  fillRect(set, 8 + lx, hy, 19 + lx, hy, hrD);
  fillRect(set, 7 + lx, hy + 1, 20 + lx, hy + 2, hr);
  set(9 + lx, hy + 1, hrH);
  set(10 + lx, hy + 1, hrH);

  // Head
  fillRect(set, 8 + lx, hy + 3, 19 + lx, hy + 9, sk);
  set(7 + lx, hy + 5, sk);
  set(20 + lx, hy + 5, skM);
  set(10 + lx, hy + 5, skH);
  set(11 + lx, hy + 6, o);
  set(12 + lx, hy + 6, skH);
  set(15 + lx, hy + 6, o);
  set(16 + lx, hy + 6, skH);
  set(13 + lx, hy + 7, skM);
  set(12 + lx, hy + 8, skS);
  set(13 + lx, hy + 8, skM);

  // Scarf
  fillRect(set, 8 + lx, hy + 10, 19 + lx, hy + 10, sc);
  set(7 + lx, hy + 10, scD);
  set(10 + lx, hy + 10, scH);
  set(11 + lx, hy + 10, scH);
  set(20 + lx, hy + 11, sc);
  set(21 + lx, hy + 12, scD);
  set(22 + lx, hy + 13, sc);
  set(22 + lx, hy + 14, scD);

  // Coat
  fillRect(set, 8 + lx, 14, 19 + lx, 22, sh);
  for (let y = 14; y <= 22; y++) {
    set(8 + lx, y, shM);
    set(19 + lx, y, shM);
  }
  fillRect(set, 8 + lx, 22, 19 + lx, 22, shD);
  for (let y = 15; y <= 19; y++) set(11 + lx, y, shH);
  set(12 + lx, 15, shH);
  set(13 + lx, 16, o);
  set(13 + lx, 18, o);

  // Default arms
  set(5 + lx, 15, sk);
  set(4 + lx, 16, sk);
  set(4 + lx, 17, skM);
  set(3 + lx, 16, sk);
  set(22 + lx, 15, sk);
  set(23 + lx, 16, sk);
  set(23 + lx, 17, skM);
  set(24 + lx, 16, sk);
  set(7 + lx, 15, sh);
  set(20 + lx, 15, sh);

  // Legs default
  for (let y = 23; y <= 30; y++) {
    set(10 + lx, y, pnH);
    set(11 + lx, y, pn);
    set(12 + lx, y, pnD);
    set(13 + lx, y, pn);
    set(14 + lx, y, pn);
    set(15 + lx, y, pn);
    set(16 + lx, y, pnD);
    set(17 + lx, y, pn);
  }
  set(11 + lx, 26, pnH);
  set(15 + lx, 26, pnH);

  // Shoes
  fillRect(set, 9 + lx, 31, 13 + lx, 33, shs);
  fillRect(set, 14 + lx, 31, 18 + lx, 33, shs);
  set(9 + lx, 31, shsH);
  set(14 + lx, 31, shsH);
  set(8 + lx, 33, shs);
  set(19 + lx, 33, shs);
  fillRect(set, 10 + lx, 34, 12 + lx, 35, shs);
  fillRect(set, 15 + lx, 34, 17 + lx, 35, shs);

  return g;
}

function teenIdle(frame: number): Cell[] {
  // Brawler bounce — 4 frames
  const bob = [0, 1, 2, 1][frame % 4]!;
  const g = teenBase(bob, 0);
  const set = setter(g, TW, TH);
  const sk = T.skin;
  // Fists slightly up on bounce peak
  if (bob >= 1) {
    set(4, 14, sk);
    set(3, 15, sk);
    set(23, 14, sk);
    set(24, 15, sk);
  }
  return g;
}

function clearLegsArms(g: Cell[], fromY = 15): void {
  for (let y = fromY; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      if (y >= 23 || x <= 7 || x >= 20) g[y * TW + x] = null;
    }
  }
}

function teenWalk(frame: number): Cell[] {
  const g = teenBase(0, 0);
  const set = setter(g, TW, TH);
  const pnH = T.pantsHi;
  const pn = T.pants;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;
  const sk = T.skin;
  const skM = T.skinMid;
  const sh = T.shirt;

  clearLegsArms(g);

  const f = frame % 6;
  if (f === 0 || f === 1) {
    fillRect(set, 5, 23, 11, 28, pn);
    set(6, 23, pnH);
    fillRect(set, 4, 29, 9, 31, pnD);
    fillRect(set, 3, 32, 9, 34, shs);
    set(3, 32, shsH);
    fillRect(set, 14, 23, 20, 27, pn);
    set(15, 23, pnH);
    fillRect(set, 17, 28, 22, 31, pnD);
    fillRect(set, 18, 32, 24, 34, shs);
    set(18, 32, shsH);
    fillRect(set, 2, 15, 5, 20, sk);
    set(1, 17, skM);
    fillRect(set, 22, 15, 25, 20, sk);
    set(26, 17, skM);
    set(7, 15, sh);
    set(20, 15, sh);
  } else if (f === 2 || f === 5) {
    fillRect(set, 9, 23, 13, 30, pn);
    set(10, 23, pnH);
    fillRect(set, 8, 31, 13, 33, shs);
    fillRect(set, 14, 23, 18, 30, pn);
    set(15, 23, pnH);
    fillRect(set, 14, 31, 19, 33, shs);
    fillRect(set, 4, 15, 6, 20, sk);
    fillRect(set, 21, 15, 23, 20, sk);
  } else {
    fillRect(set, 14, 23, 20, 28, pn);
    set(15, 23, pnH);
    fillRect(set, 16, 29, 21, 31, pnD);
    fillRect(set, 17, 32, 23, 34, shs);
    set(17, 32, shsH);
    fillRect(set, 5, 23, 11, 27, pn);
    set(6, 23, pnH);
    fillRect(set, 3, 28, 8, 31, pnD);
    fillRect(set, 2, 32, 8, 34, shs);
    set(2, 32, shsH);
    fillRect(set, 1, 15, 4, 20, sk);
    set(0, 17, skM);
    fillRect(set, 22, 15, 25, 20, sk);
    set(7, 15, sh);
    set(20, 15, sh);
  }
  return g;
}

function teenRun(frame: number): Cell[] {
  // Lean sprint — body shifted forward, scarf trails
  const lean = 2;
  const g = teenBase(frame % 2, lean);
  const set = setter(g, TW, TH);
  const pnH = T.pantsHi;
  const pn = T.pants;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;
  const sk = T.skin;
  const skM = T.skinMid;
  const sc = T.scarf;
  const scD = T.scarfDark;

  clearLegsArms(g, 14);

  const f = frame % 6;
  // Scarf trail behind
  set(1, 12, sc);
  set(0, 13, scD);
  set(0, 14, sc);
  if (f % 2 === 0) set(0, 15, scD);

  // Long stride
  if (f < 3) {
    fillRect(set, 4 + lean, 23, 10 + lean, 27, pn);
    set(5 + lean, 23, pnH);
    fillRect(set, 2 + lean, 28, 7 + lean, 30, pnD);
    fillRect(set, 1 + lean, 31, 7 + lean, 33, shs);
    set(1 + lean, 31, shsH);
    fillRect(set, 15 + lean, 23, 21 + lean, 26, pn);
    set(16 + lean, 23, pnH);
    fillRect(set, 18 + lean, 27, 23 + lean, 29, pnD);
    fillRect(set, 19 + lean, 30, 25 + lean, 32, shs);
    set(19 + lean, 30, shsH);
    // Pumping arms
    fillRect(set, 0 + lean, 14, 3 + lean, 18, sk);
    set(0 + lean, 13, sk);
    fillRect(set, 22 + lean, 16, 26 + lean, 20, sk);
    set(27 + lean, 18, skM);
  } else {
    fillRect(set, 15 + lean, 23, 21 + lean, 27, pn);
    set(16 + lean, 23, pnH);
    fillRect(set, 18 + lean, 28, 23 + lean, 30, pnD);
    fillRect(set, 19 + lean, 31, 25 + lean, 33, shs);
    set(19 + lean, 31, shsH);
    fillRect(set, 4 + lean, 23, 10 + lean, 26, pn);
    set(5 + lean, 23, pnH);
    fillRect(set, 2 + lean, 27, 7 + lean, 29, pnD);
    fillRect(set, 1 + lean, 30, 7 + lean, 32, shs);
    set(1 + lean, 30, shsH);
    fillRect(set, 0 + lean, 16, 3 + lean, 20, sk);
    fillRect(set, 22 + lean, 13, 26 + lean, 18, sk);
    set(27 + lean, 14, sk);
  }
  return g;
}

function teenInspect(frame: number): Cell[] {
  const g = teenIdle(frame % 4);
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const skH = T.skinHi;
  const o = T.outline;
  for (let y = 14; y <= 22; y++) {
    set(22, y, null);
    set(23, y, null);
    set(24, y, null);
  }
  const r = frame % 4;
  set(21, 14, sk);
  set(22, 13 - Math.min(1, r), sk);
  set(23, 12 - Math.min(2, r), skH);
  set(24, 11 - Math.min(2, r), sk);
  set(23, 11 - Math.min(1, r), o);
  if (r >= 2) set(24, 10, skH);
  return g;
}

function teenPunch(frame: number): Cell[] {
  // 4-frame punch combo wind → jab → extend → recover
  const g = teenBase(0, 1);
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const skH = T.skinHi;
  const skM = T.skinMid;
  const o = T.outline;
  const sh = T.shirt;

  for (let y = 14; y <= 22; y++) {
    for (let x = 20; x < TW; x++) set(x, y, null);
    for (let x = 0; x <= 6; x++) set(x, y, null);
  }

  const f = frame % 4;
  // Guard hand back
  set(4, 16, sk);
  set(3, 17, skM);
  set(7, 15, sh);

  if (f === 0) {
    // Wind
    set(20, 15, sk);
    set(21, 14, sk);
    set(22, 13, skH);
    set(21, 16, skM);
  } else if (f === 1) {
    // Jab
    set(20, 15, sk);
    set(21, 15, sk);
    set(22, 15, skH);
    set(23, 15, sk);
    set(24, 15, skH);
    set(23, 14, o);
    set(24, 16, skM);
  } else if (f === 2) {
    // Full extend + follow
    set(20, 15, sk);
    set(21, 15, sk);
    set(22, 15, sk);
    set(23, 15, skH);
    set(24, 15, skH);
    set(25, 15, sk);
    set(26, 15, skH);
    set(25, 14, o);
    set(26, 16, skM);
    set(19, 14, sh);
  } else {
    // Recover
    set(20, 16, sk);
    set(21, 16, skH);
    set(22, 17, skM);
  }
  return g;
}

function teenKick(frame: number): Cell[] {
  const g = teenBase(0, 0);
  const set = setter(g, TW, TH);
  const pn = T.pants;
  const pnH = T.pantsHi;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;

  for (let y = 23; y < TH; y++) {
    for (let x = 0; x < TW; x++) g[y * TW + x] = null;
  }

  // Planted leg
  fillRect(set, 8, 23, 12, 28, pn);
  set(9, 23, pnH);
  fillRect(set, 7, 29, 11, 31, pnD);
  fillRect(set, 6, 32, 11, 34, shs);
  set(6, 32, shsH);

  const f = frame % 3;
  if (f === 0) {
    fillRect(set, 14, 23, 18, 27, pn);
    set(15, 23, pnH);
    fillRect(set, 16, 28, 20, 30, shs);
    set(18, 28, shsH);
  } else if (f === 1) {
    fillRect(set, 15, 22, 19, 25, pn);
    set(16, 22, pnH);
    fillRect(set, 18, 24, 23, 26, pnD);
    fillRect(set, 21, 25, 26, 28, shs);
    set(24, 25, shsH);
  } else {
    fillRect(set, 14, 21, 18, 24, pnH);
    fillRect(set, 18, 22, 24, 24, pn);
    fillRect(set, 22, 23, 27, 26, shs);
    set(25, 23, shsH);
  }
  return g;
}

function teenJump(_frame: number): Cell[] {
  const g = teenBase(0, 0);
  const set = setter(g, TW, TH);
  const pn = T.pants;
  const shs = T.shoes;
  const sk = T.skin;

  for (let y = 23; y < TH; y++) {
    for (let x = 0; x < TW; x++) g[y * TW + x] = null;
  }
  fillRect(set, 7, 23, 11, 26, pn);
  fillRect(set, 5, 27, 9, 29, shs);
  fillRect(set, 15, 23, 19, 26, pn);
  fillRect(set, 17, 27, 21, 29, shs);
  set(3, 15, sk);
  set(24, 15, sk);
  return g;
}

function teenHurt(frame: number): Cell[] {
  const g = teenBase(1, -1);
  const set = setter(g, TW, TH);
  const o = T.outline;
  // Recoil eyes + flash
  set(10, 7, o);
  set(15, 7, o);
  set(12, 9, '#e05050');
  if (frame % 2 === 1) {
    set(11, 8, '#e07070');
    set(14, 8, '#e07070');
  }
  return g;
}

function teenBazar(frame: number): Cell[] {
  const g = teenBase(frame % 2, 0);
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const skH = T.skinHi;
  const sc = T.scarf;
  const scD = T.scarfDark;
  const o = T.outline;

  // Arms out wide shout
  for (let y = 14; y <= 20; y++) {
    for (let x = 0; x <= 5; x++) set(x, y, null);
    for (let x = 22; x < TW; x++) set(x, y, null);
  }
  fillRect(set, 0, 14, 4, 17, sk);
  set(0, 13, skH);
  fillRect(set, 23, 14, 27, 17, sk);
  set(27, 13, skH);
  // Open mouth
  set(12, 8, o);
  set(13, 8, o);
  set(14, 8, sc);
  if (frame % 2 === 1) {
    set(11, 7, sc);
    set(15, 7, scD);
    set(1, 12, sk);
    set(26, 12, sk);
  }
  return g;
}

export type PlayerSpriteKind =
  | 'adult_idle'
  | 'adult_walk'
  | 'adult_inspect'
  | 'teen_idle'
  | 'teen_walk'
  | 'teen_run'
  | 'teen_inspect'
  | 'teen_punch'
  | 'teen_kick'
  | 'teen_jump'
  | 'teen_hurt'
  | 'teen_bazar';

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
    case 'teen_punch':
      cells = teenPunch(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_kick':
      cells = teenKick(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_jump':
      cells = teenJump(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_hurt':
      cells = teenHurt(frame);
      w = TW;
      h = TH;
      break;
    case 'teen_bazar':
      cells = teenBazar(frame);
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

/** Frame counts for fluid clips (matches Player anim maps). */
export const SPRITE_FRAME_COUNTS = {
  adult_idle: 4,
  adult_walk: 6,
  adult_inspect: 4,
  teen_idle: 4,
  teen_walk: 6,
  teen_run: 6,
  teen_inspect: 4,
  teen_punch: 4,
  teen_kick: 3,
  teen_jump: 1,
  teen_hurt: 2,
  teen_bazar: 2,
} as const;
