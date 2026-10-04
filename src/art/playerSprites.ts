/**
 * Neo-Noir fluid player sprites — 32–48px layouts, sub-stepped clips.
 * Adult 2026: 32×44 · Teen 1995: 28×40
 * Likeness: bald, fair, wide smile, navy crew sweatshirt
 * (media/player-reference-photo.png). Crisp blit via blitGrid.
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

type FaceMode = 'smile' | 'soft' | 'shout' | 'hurt';

type Pal = typeof ADULT_PAL | typeof TEEN_PAL;

/** Bald oval head + thin brows, light eyes, wide teeth smile — hi-detail shading. */
function drawBaldFace(
  set: (x: number, y: number, c: Cell) => void,
  lx: number,
  hy: number,
  pal: Pal,
  mode: FaceMode,
  /** Adult head is wider; teen slightly tighter. */
  adult: boolean,
): void {
  const o = pal.outline;
  const skH = pal.skinHi;
  const sk = pal.skin;
  const skM = pal.skinMid;
  const skS = pal.skinShadow;
  const eye = pal.eye;
  const eyeW = pal.eyeWhite;
  const pupil = pal.pupil;
  const teeth = pal.teeth;
  const brow = pal.brow;
  const lip = pal.lip;
  const ear = pal.ear;

  const x0 = (adult ? 10 : 8) + lx;
  const x1 = (adult ? 21 : 19) + lx;
  const mid = Math.floor((x0 + x1) / 2);

  // Smooth bald scalp — rounded crown with highlight + temple shadow
  fillRect(set, x0 + 1, hy, x1 - 1, hy, skM);
  fillRect(set, x0, hy + 1, x1, hy + (adult ? 3 : 2), sk);
  set(x0 + 2, hy + 1, skH);
  set(x0 + 3, hy + 1, skH);
  set(x0 + 4, hy + 1, skH);
  set(mid, hy + 1, skH);
  set(x1 - 1, hy + 2, skS);
  set(x1, hy + 2, skS);
  set(x0, hy + 2, skM);

  // Face oval with cheek planes
  const faceBot = hy + (adult ? 11 : 9);
  fillRect(set, x0, hy + (adult ? 4 : 3), x1, faceBot, sk);
  // Left cheek highlight / right cheek shadow
  for (let y = hy + (adult ? 5 : 4); y <= faceBot - 1; y++) {
    set(x0 + 1, y, skH);
    set(x1 - 1, y, skM);
  }
  set(x0 - 1, hy + (adult ? 6 : 5), skM);
  set(x1 + 1, hy + (adult ? 6 : 5), skS);
  set(x0 + 2, hy + (adult ? 5 : 4), skH);
  set(x0 + 3, hy + (adult ? 5 : 4), skH);

  // Ears
  set(x0 - 1, hy + (adult ? 6 : 5), ear);
  set(x0 - 2, hy + (adult ? 7 : 6), skM);
  set(x1 + 1, hy + (adult ? 6 : 5), ear);
  set(x1 + 2, hy + (adult ? 7 : 6), skS);

  // Jaw outline + chin shadow
  set(x0 - 1, hy + (adult ? 5 : 4), o);
  set(x1 + 1, hy + (adult ? 5 : 4), o);
  set(x0 - 1, faceBot - 1, o);
  set(x1 + 1, faceBot - 1, o);
  set(mid - 1, faceBot, skM);
  set(mid, faceBot, skS);
  set(mid + 1, faceBot, skM);

  const eyeY = hy + (adult ? 7 : 5);
  const browY = eyeY - 1;
  const mouthY = hy + (adult ? 10 : 8);

  // Thin light brows with slight arch
  set(x0 + 2, browY, brow);
  set(x0 + 3, browY, brow);
  set(x0 + 4, browY - (adult ? 1 : 0), brow);
  set(x1 - 4, browY - (adult ? 1 : 0), brow);
  set(x1 - 3, browY, brow);
  set(x1 - 2, browY, brow);

  if (mode === 'hurt') {
    set(x0 + 2, eyeY, o);
    set(x0 + 3, eyeY, o);
    set(x1 - 3, eyeY, o);
    set(x1 - 2, eyeY, o);
    set(mid, mouthY, pal.lip);
    set(mid - 1, mouthY, skS);
    set(mid + 1, mouthY, skS);
    return;
  }

  // Eyes: white + iris + pupil (squint on big smile / shout)
  const squint = mode === 'smile' || mode === 'shout';
  if (squint) {
    set(x0 + 2, eyeY, o);
    set(x0 + 3, eyeY, eye);
    set(x0 + 4, eyeY, pupil);
    set(x1 - 4, eyeY, pupil);
    set(x1 - 3, eyeY, eye);
    set(x1 - 2, eyeY, o);
    set(x0 + 2, eyeY - 1, brow);
    set(x1 - 2, eyeY - 1, brow);
    // Crow's feet / smile lift
    set(x0 + 1, eyeY, skH);
    set(x1 - 1, eyeY, skH);
  } else {
    set(x0 + 2, eyeY, eyeW);
    set(x0 + 3, eyeY, eye);
    set(x0 + 4, eyeY, pupil);
    set(x0 + 5, eyeY, skH);
    set(x1 - 5, eyeY, skH);
    set(x1 - 4, eyeY, pupil);
    set(x1 - 3, eyeY, eye);
    set(x1 - 2, eyeY, eyeW);
  }

  // Nose — bridge + tip shadow
  set(mid, eyeY + 1, skM);
  set(mid + 1, eyeY + 1, skS);
  set(mid, eyeY + 2, skS);
  if (adult) set(mid - 1, eyeY + 2, skM);

  // Mouth
  if (mode === 'shout') {
    fillRect(set, mid - 2, mouthY - 1, mid + 2, mouthY, o);
    fillRect(set, mid - 1, mouthY - 1, mid + 1, mouthY - 1, teeth);
    set(mid - 2, mouthY, teeth);
    set(mid - 1, mouthY, teeth);
    set(mid, mouthY, teeth);
    set(mid + 1, mouthY, teeth);
    set(mid + 2, mouthY, teeth);
    set(mid - 3, mouthY - 1, lip);
    set(mid + 3, mouthY - 1, lip);
  } else if (mode === 'soft') {
    set(mid - 2, mouthY, lip);
    set(mid - 1, mouthY, teeth);
    set(mid, mouthY, teeth);
    set(mid + 1, mouthY, teeth);
    set(mid + 2, mouthY, lip);
    set(mid - 1, mouthY + (adult ? 1 : 0), skM);
    set(mid + 1, mouthY + (adult ? 1 : 0), skM);
  } else {
    // Wide friendly smile showing teeth + lip corners
    set(mid - 3, mouthY, lip);
    fillRect(set, mid - 2, mouthY, mid + 2, mouthY, teeth);
    set(mid + 3, mouthY, lip);
    set(mid - 2, mouthY + (adult ? 1 : 0), o);
    set(mid - 1, mouthY + (adult ? 1 : 0), teeth);
    set(mid, mouthY + (adult ? 1 : 0), teeth);
    set(mid + 1, mouthY + (adult ? 1 : 0), teeth);
    set(mid + 2, mouthY + (adult ? 1 : 0), o);
    // Cheek lift
    set(x0 + 1, mouthY - 1, skH);
    set(x1 - 1, mouthY - 1, skH);
    set(x0, mouthY - 1, skH);
    set(x1, mouthY - 1, skH);
  }
}

/* ───────────────────────── Adult 2026 ───────────────────────── */

function adultIdle(frame: number): Cell[] {
  // 4-frame breathing: chest + shoulder lift
  const breath = [0, 1, 1, 0][frame % 4]!;
  const soft = frame % 4 === 0 || frame % 4 === 3;
  const g = grid(AW, AH);
  const set = setter(g, AW, AH);
  const hy = breath;

  const o = A.outline;
  const sk = A.skin;
  const skH = A.skinHi;
  const skM = A.skinMid;
  const skS = A.skinShadow;
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
  const tag = A.tag;

  drawBaldFace(set, 0, hy, A, soft ? 'soft' : 'smile', true);

  // Neck
  set(14, hy + 12, sk);
  set(15, hy + 12, sk);
  set(16, hy + 12, skM);
  set(17, hy + 12, skM);

  // Crew-neck collar + navy torso (breath raises shoulders)
  const ty = 14;
  fillRect(set, 12, ty, 19, ty, shD);
  set(13, ty, shM);
  set(14, ty, sh);
  set(15, ty, sh);
  set(16, ty, shM);
  fillRect(set, 10, ty + 1, 21, ty + 11 + breath, sh);
  for (let y = ty + 1; y <= ty + 10; y++) {
    set(10, y, shD);
    set(21, y, shD);
  }
  // Fabric folds — knit highlight streak + armpit creases
  for (let y = ty + 2; y <= ty + 8; y++) set(12, y, shH);
  set(13, ty + 2, shH);
  set(13, ty + 3, shH);
  set(14, ty + 5, shM);
  set(15, ty + 6, shD);
  set(18, ty + 3, shH);
  set(19, ty + 4, shM);
  set(11, ty + 4, shD);
  set(20, ty + 5, shD);
  set(17, ty + 8, shM);
  // Small left-chest tag
  set(16, ty + 4, tag);
  set(17, ty + 4, tag);
  set(16, ty + 5, shM);
  set(17, ty + 5, shD);

  // Lean arms + hands with finger tips
  fillRect(set, 6, ty + 1, 8, ty + 8, sk);
  set(5, ty + 3, sk);
  set(5, ty + 4, skM);
  set(6, ty + 2, skH);
  set(7, ty + 5, skM);
  set(6, ty + 9, skM);
  set(7, ty + 9, skS);
  set(5, ty + 9, sk); // thumb
  set(6, ty + 10, skH); // fingers
  set(7, ty + 10, sk);
  set(8, ty + 10, skM);
  fillRect(set, 23, ty + 1, 25, ty + 8, sk);
  set(26, ty + 3, sk);
  set(26, ty + 4, skM);
  set(24, ty + 2, skH);
  set(24, ty + 5, skM);
  set(24, ty + 9, skM);
  set(25, ty + 9, skS);
  set(26, ty + 9, sk);
  set(23, ty + 10, skM);
  set(24, ty + 10, skH);
  set(25, ty + 10, sk);
  set(9, ty + 1, sh);
  set(9, ty + 2, shM);
  set(9, ty + 3, shD); // sleeve cuff shadow
  set(22, ty + 1, sh);
  set(22, ty + 2, shM);
  set(22, ty + 3, shD);

  // Belt / waistband
  fillRect(set, 10, 27, 21, 27, blD);
  set(14, 27, bl);
  set(15, 27, bl);
  set(16, 27, bl);

  // Legs with crease highlights
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
  set(12, 34, pnD);
  set(19, 34, pnD);

  // Shoes with sole + lace hint
  fillRect(set, 10, 37, 15, 39, shs);
  fillRect(set, 16, 37, 21, 39, shs);
  set(10, 37, shsH);
  set(16, 37, shsH);
  set(12, 38, shsH);
  set(18, 38, shsH);
  set(9, 39, shs);
  set(22, 39, shs);
  fillRect(set, 11, 40, 14, 41, shs);
  fillRect(set, 17, 40, 20, 41, shs);
  set(11, 41, A.shoes); // sole
  set(14, 41, A.shoes);
  set(17, 41, A.shoes);
  set(20, 41, A.shoes);

  // Tiny outline accents on crown edge (smooth bald silhouette)
  set(9, hy + 2, o);
  set(22, hy + 2, o);

  return g;
}

function adultWalk(frame: number): Cell[] {
  const g = adultIdle(1);
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

function teenBase(hy: number, lean = 0, face: FaceMode = 'smile'): Cell[] {
  const g = grid(TW, TH);
  const set = setter(g, TW, TH);

  const o = T.outline;
  const sk = T.skin;
  const skH = T.skinHi;
  const skM = T.skinMid;
  const shH = T.shirtHi;
  const sh = T.shirt;
  const shM = T.shirtMid;
  const shD = T.shirtDark;
  const pnH = T.pantsHi;
  const pn = T.pants;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;
  const tag = T.tag;

  const lx = lean;

  drawBaldFace(set, lx, hy, T, face, false);
  set(7 + lx, hy + 2, o);
  set(20 + lx, hy + 2, o);

  // Slim neck into crew collar
  set(12 + lx, hy + 10, sk);
  set(13 + lx, hy + 10, sk);
  set(14 + lx, hy + 10, skM);
  set(15 + lx, hy + 10, skM);

  // Navy crew sweatshirt (leaner teen proportions)
  fillRect(set, 10 + lx, 12, 17 + lx, 12, shD);
  set(11 + lx, 12, shM);
  set(12 + lx, 12, sh);
  set(13 + lx, 12, sh);
  set(14 + lx, 12, shM);
  fillRect(set, 8 + lx, 13, 19 + lx, 22, sh);
  for (let y = 13; y <= 22; y++) {
    set(8 + lx, y, shM);
    set(19 + lx, y, shM);
  }
  fillRect(set, 8 + lx, 22, 19 + lx, 22, shD);
  for (let y = 14; y <= 18; y++) set(10 + lx, y, shH);
  set(11 + lx, 14, shH);
  set(12 + lx, 16, shM);
  set(13 + lx, 17, shD);
  set(16 + lx, 15, shH);
  set(17 + lx, 16, shM);
  set(9 + lx, 15, shD);
  set(18 + lx, 17, shD);
  // Chest tag
  set(14 + lx, 15, tag);
  set(15 + lx, 15, tag);
  set(14 + lx, 16, shM);
  set(15 + lx, 16, shD);

  // Default arms + finger tips
  set(5 + lx, 14, sk);
  set(4 + lx, 15, sk);
  set(4 + lx, 16, skM);
  set(3 + lx, 15, sk);
  set(5 + lx, 17, skH);
  set(4 + lx, 18, sk);
  set(3 + lx, 18, skM);
  set(5 + lx, 18, sk);
  set(22 + lx, 14, sk);
  set(23 + lx, 15, sk);
  set(23 + lx, 16, skM);
  set(24 + lx, 15, sk);
  set(22 + lx, 17, skH);
  set(23 + lx, 18, sk);
  set(24 + lx, 18, skM);
  set(22 + lx, 18, sk);
  set(7 + lx, 14, sh);
  set(7 + lx, 15, shM);
  set(20 + lx, 14, sh);
  set(20 + lx, 15, shM);

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
  const bob = [0, 1, 2, 1][frame % 4]!;
  const soft = bob === 0;
  const g = teenBase(bob, 0, soft ? 'soft' : 'smile');
  const set = setter(g, TW, TH);
  const sk = T.skin;
  if (bob >= 1) {
    set(4, 13, sk);
    set(3, 14, sk);
    set(23, 13, sk);
    set(24, 14, sk);
  }
  return g;
}

function clearLegsArms(g: Cell[], fromY = 14): void {
  for (let y = fromY; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      if (y >= 23 || x <= 7 || x >= 20) g[y * TW + x] = null;
    }
  }
}

function teenWalk(frame: number): Cell[] {
  const g = teenBase(0, 0, 'smile');
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
    fillRect(set, 2, 14, 5, 19, sk);
    set(1, 16, skM);
    fillRect(set, 22, 14, 25, 19, sk);
    set(26, 16, skM);
    set(7, 14, sh);
    set(20, 14, sh);
  } else if (f === 2 || f === 5) {
    fillRect(set, 9, 23, 13, 30, pn);
    set(10, 23, pnH);
    fillRect(set, 8, 31, 13, 33, shs);
    fillRect(set, 14, 23, 18, 30, pn);
    set(15, 23, pnH);
    fillRect(set, 14, 31, 19, 33, shs);
    fillRect(set, 4, 14, 6, 19, sk);
    fillRect(set, 21, 14, 23, 19, sk);
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
    fillRect(set, 1, 14, 4, 19, sk);
    set(0, 16, skM);
    fillRect(set, 22, 14, 25, 19, sk);
    set(7, 14, sh);
    set(20, 14, sh);
  }
  return g;
}

function teenRun(frame: number): Cell[] {
  // Lean sprint — body shifted forward (no scarf; same navy top)
  const lean = 2;
  const g = teenBase(frame % 2, lean, 'smile');
  const set = setter(g, TW, TH);
  const pnH = T.pantsHi;
  const pn = T.pants;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;
  const sk = T.skin;
  const skM = T.skinMid;

  clearLegsArms(g, 13);

  const f = frame % 6;

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
    fillRect(set, 0 + lean, 13, 3 + lean, 17, sk);
    set(0 + lean, 12, sk);
    fillRect(set, 22 + lean, 15, 26 + lean, 19, sk);
    set(27 + lean, 17, skM);
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
    fillRect(set, 0 + lean, 15, 3 + lean, 19, sk);
    fillRect(set, 22 + lean, 12, 26 + lean, 17, sk);
    set(27 + lean, 13, sk);
  }
  return g;
}

function teenInspect(frame: number): Cell[] {
  const g = teenIdle(frame % 4);
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const skH = T.skinHi;
  const o = T.outline;
  for (let y = 13; y <= 21; y++) {
    set(22, y, null);
    set(23, y, null);
    set(24, y, null);
  }
  const r = frame % 4;
  set(21, 13, sk);
  set(22, 12 - Math.min(1, r), sk);
  set(23, 11 - Math.min(2, r), skH);
  set(24, 10 - Math.min(2, r), sk);
  set(23, 10 - Math.min(1, r), o);
  if (r >= 2) set(24, 9, skH);
  return g;
}

function teenPunch(frame: number): Cell[] {
  const g = teenBase(0, 1, 'smile');
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const skH = T.skinHi;
  const skM = T.skinMid;
  const o = T.outline;
  const sh = T.shirt;

  for (let y = 13; y <= 21; y++) {
    for (let x = 20; x < TW; x++) set(x, y, null);
    for (let x = 0; x <= 6; x++) set(x, y, null);
  }

  const f = frame % 4;
  set(4, 15, sk);
  set(3, 16, skM);
  set(7, 14, sh);

  if (f === 0) {
    set(20, 14, sk);
    set(21, 13, sk);
    set(22, 12, skH);
    set(21, 15, skM);
  } else if (f === 1) {
    set(20, 14, sk);
    set(21, 14, sk);
    set(22, 14, skH);
    set(23, 14, sk);
    set(24, 14, skH);
    set(23, 13, o);
    set(24, 15, skM);
  } else if (f === 2) {
    set(20, 14, sk);
    set(21, 14, sk);
    set(22, 14, sk);
    set(23, 14, skH);
    set(24, 14, skH);
    set(25, 14, sk);
    set(26, 14, skH);
    set(25, 13, o);
    set(26, 15, skM);
    set(19, 13, sh);
  } else {
    set(20, 15, sk);
    set(21, 15, skH);
    set(22, 16, skM);
  }
  return g;
}

function teenKick(frame: number): Cell[] {
  const g = teenBase(0, 0, 'smile');
  const set = setter(g, TW, TH);
  const pn = T.pants;
  const pnH = T.pantsHi;
  const pnD = T.pantsDark;
  const shs = T.shoes;
  const shsH = T.shoesHi;

  for (let y = 23; y < TH; y++) {
    for (let x = 0; x < TW; x++) g[y * TW + x] = null;
  }

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
  const g = teenBase(0, 0, 'smile');
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
  set(3, 14, sk);
  set(24, 14, sk);
  return g;
}

function teenHurt(frame: number): Cell[] {
  const g = teenBase(1, -1, 'hurt');
  const set = setter(g, TW, TH);
  if (frame % 2 === 1) {
    set(11, 7, T.lip);
    set(14, 7, T.lip);
  }
  return g;
}

/** Paint black outline on transparent neighbors of opaque pixels (MD silhouette). */
function ensureBlackOutline(cells: Cell[], w: number, h: number, outline = '#000000'): void {
  const ink: boolean[] = [];
  for (let i = 0; i < cells.length; i++) ink[i] = cells[i] != null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (ink[i]) continue;
      const n =
        (x > 0 && ink[i - 1]) ||
        (x < w - 1 && ink[i + 1]) ||
        (y > 0 && ink[i - w]) ||
        (y < h - 1 && ink[i + w]);
      if (n) cells[i] = outline;
    }
  }
}

function buildPlayerCells(kind: PlayerSpriteKind, frame: number): { cells: Cell[]; w: number; h: number } {
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
  ensureBlackOutline(cells, w, h);
  return { cells, w, h };
}

/** Unique non-null hex colors in a sprite grid (for CI / MD budget). */
export function countUniqueColors(cells: ReadonlyArray<string | null>): number {
  const set = new Set<string>();
  for (const c of cells) {
    if (c) set.add(c.toLowerCase());
  }
  return set.size;
}

/** Build every player clip frame for palette audits. */
export function auditPlayerSpriteColors(): Array<{
  id: string;
  colors: number;
  hexes: string[];
}> {
  const out: Array<{ id: string; colors: number; hexes: string[] }> = [];
  for (const [kind, frames] of Object.entries(SPRITE_FRAME_COUNTS)) {
    for (let f = 0; f < frames; f++) {
      const { cells } = buildPlayerCells(kind as PlayerSpriteKind, f);
      const hexes = [
        ...new Set(cells.filter((c): c is string => !!c).map((c) => c.toLowerCase())),
      ].sort();
      out.push({ id: `${kind}[${f}]`, colors: hexes.length, hexes });
    }
  }
  return out;
}

function teenBazar(frame: number): Cell[] {
  const g = teenBase(frame % 2, 0, 'shout');
  const set = setter(g, TW, TH);
  const sk = T.skin;
  const skH = T.skinHi;

  for (let y = 13; y <= 19; y++) {
    for (let x = 0; x <= 5; x++) set(x, y, null);
    for (let x = 22; x < TW; x++) set(x, y, null);
  }
  fillRect(set, 0, 13, 4, 16, sk);
  set(0, 12, skH);
  fillRect(set, 23, 13, 27, 16, sk);
  set(27, 12, skH);
  if (frame % 2 === 1) {
    set(1, 11, sk);
    set(26, 11, sk);
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

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  kind: PlayerSpriteKind,
  frame: number,
  x: number,
  y: number,
  facing: 1 | -1,
): void {
  const { cells, w, h } = buildPlayerCells(kind, frame);
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
