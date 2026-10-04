/**
 * Mom (Рынок МЕХА) — Mega Drive NPC sprite, 28×42.
 * Black outline, 3 tones per material, ≤15 colors.
 * Idle bob + panic arm raise (same gameplay cues as before).
 */

import { MOM_PAL } from './segaPalette';
import { blitGrid } from './pixelDraw';
import { countUniqueColors } from './playerSprites';

type Cell = string | null;

const MW = 28;
const MH = 42;
const P = MOM_PAL;

function grid(): Cell[] {
  return Array(MW * MH).fill(null);
}

function setter(g: Cell[]) {
  return (x: number, y: number, c: Cell) => {
    if (x < 0 || x >= MW || y < 0 || y >= MH) return;
    g[y * MW + x] = c;
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

function ensureBlackOutline(cells: Cell[]): void {
  const ink = cells.map((c) => c != null);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (ink[i]) continue;
      const n =
        (x > 0 && ink[i - 1]) ||
        (x < MW - 1 && ink[i + 1]) ||
        (y > 0 && ink[i - MW]) ||
        (y < MH - 1 && ink[i + MW]);
      if (n) cells[i] = P.outline;
    }
  }
}

function drawMomFace(set: (x: number, y: number, c: Cell) => void, hy: number): void {
  // Headscarf frame
  fillRect(set, 8, hy, 19, hy + 2, P.scarf);
  fillRect(set, 7, hy + 2, 8, hy + 10, P.scarf);
  fillRect(set, 19, hy + 2, 20, hy + 10, P.scarfDark);
  // Face oval — readable eyes / mouth
  fillRect(set, 9, hy + 3, 18, hy + 12, P.skin);
  fillRect(set, 10, hy + 4, 12, hy + 9, P.skinHi);
  fillRect(set, 15, hy + 5, 17, hy + 10, P.skinShadow);
  // Eyes
  set(11, hy + 7, P.pupil);
  set(12, hy + 7, P.eyeWhite);
  set(15, hy + 7, P.eyeWhite);
  set(16, hy + 7, P.pupil);
  // Nose + lip
  set(13, hy + 9, P.skinShadow);
  set(14, hy + 9, P.skinShadow);
  set(12, hy + 11, P.lip);
  set(13, hy + 11, P.lip);
  set(14, hy + 11, P.lip);
  set(15, hy + 11, P.lip);
}

function momBody(frame: number, panic: number): Cell[] {
  const g = grid();
  const set = setter(g);
  const bob = frame % 4 === 1 || frame % 4 === 2 ? 1 : 0;
  const hy = bob;

  drawMomFace(set, hy);

  // Fur collar
  fillRect(set, 8, hy + 13, 19, hy + 15, P.fur);
  set(9, hy + 13, P.furHi);
  set(10, hy + 13, P.furHi);
  set(17, hy + 14, P.furDark);
  set(18, hy + 14, P.furDark);

  // Coat torso — 3 tones
  fillRect(set, 7, hy + 16, 20, hy + 28, P.coat);
  for (let y = hy + 17; y <= hy + 26; y++) {
    set(8, y, P.coatHi);
    set(19, y, P.coatDark);
  }
  set(12, hy + 20, P.coatDark);
  set(13, hy + 22, P.coatHi);

  // Arms
  if (panic > 0.55) {
    fillRect(set, 2, hy + 14, 6, hy + 18, P.skin);
    fillRect(set, 21, hy + 12, 25, hy + 16, P.skin);
    set(3, hy + 14, P.skinHi);
    set(24, hy + 12, P.skinHi);
    if (panic > 0.6) {
      set(25, hy + 10, P.tear);
      set(25, hy + 11, P.tear);
    }
  } else {
    fillRect(set, 3, hy + 17, 6, hy + 24, P.skin);
    fillRect(set, 21, hy + 17, 24, hy + 24, P.skin);
    set(4, hy + 18, P.skinHi);
    set(22, hy + 18, P.skinHi);
  }

  // Skirt
  fillRect(set, 9, hy + 29, 12, hy + 35, P.skirt);
  fillRect(set, 15, hy + 29, 18, hy + 35, P.skirt);
  set(10, hy + 30, P.scarfDark);
  set(16, hy + 30, P.scarfDark);

  // Boots
  fillRect(set, 8, hy + 36, 12, hy + 40, P.boots);
  fillRect(set, 15, hy + 36, 19, hy + 40, P.boots);

  ensureBlackOutline(g);
  return g;
}

export const MOM_SPRITE_SIZE = { w: MW, h: MH } as const;
export const MOM_FRAME_COUNTS = { idle: 4, panic: 4 } as const;

export function drawMomSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  frame: number,
  panic = 0,
): void {
  const cells = momBody(frame, panic);
  const ox = Math.round(x);
  const oy = Math.round(floorY);
  blitGrid(ctx, ox - Math.floor(MW / 2), oy - MH, MW, MH, cells, 1);
}

export function auditMomSpriteColors(): Array<{ id: string; colors: number; hexes: string[] }> {
  const out: Array<{ id: string; colors: number; hexes: string[] }> = [];
  for (const panic of [0.2, 0.7]) {
    for (let f = 0; f < 4; f++) {
      const cells = momBody(f, panic);
      const hexes = [
        ...new Set(cells.filter((c): c is string => !!c).map((c) => c.toLowerCase())),
      ].sort();
      out.push({
        id: `mom_panic${panic}[${f}]`,
        colors: countUniqueColors(cells),
        hexes,
      });
    }
  }
  return out;
}
