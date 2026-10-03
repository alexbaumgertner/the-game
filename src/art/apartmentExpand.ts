/**
 * Apartment expansion — туалет ← комната → кухня → ванная (Зелинского 2).
 * Hi-detail props, bottles, cigarettes, Irony of Fate bath cameo, high-tank toilet.
 */

import { APT_PAL } from '@/art/segaPalette';
import {
  ditherRect,
  greaseStain,
  px,
  speckles,
  woodGrain,
} from '@/art/pixelDraw';
import { drawUiText } from '@/art/uiFont';

const P = APT_PAL;
export const ROOM_W = 320;
export const WORLD_W = ROOM_W * 4;
export const FLOOR_Y = 192;

export const TOILET_ORIGIN = 0;
export const ROOM_ORIGIN = ROOM_W;
export const KITCHEN_ORIGIN = ROOM_W * 2;
export const BATH_ORIGIN = ROOM_W * 3;

/** Interactive hotspots (world X). */
export const CHAIN_X = TOILET_ORIGIN + 178;
export const LITTER_X = TOILET_ORIGIN + 72;
export const CIGARETTES_X = KITCHEN_ORIGIN + 252;
export const IPPOLIT_X = BATH_ORIGIN + 145;
export const TUB_X = BATH_ORIGIN + 145;

const BASE = import.meta.env.BASE_URL;

type FaceSlot = {
  img: HTMLImageElement | null;
  ready: boolean;
};

const ippolitFace: FaceSlot = { img: null, ready: false };
let faceLoadStarted = false;

/** Preload photo-adjacent Ippolit face for bath cameo. */
export function preloadIppolitFace(): void {
  if (faceLoadStarted) return;
  faceLoadStarted = true;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    ippolitFace.ready = true;
  };
  img.onerror = () => {
    ippolitFace.ready = false;
  };
  img.src = `${BASE}art/face-ippolit.png`;
  ippolitFace.img = img;
}

function drawIppolitFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  preloadIppolitFace();
  if (!ippolitFace.ready || !ippolitFace.img) return false;
  const prevSmooth = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const iw = ippolitFace.img.naturalWidth || ippolitFace.img.width;
  const ih = ippolitFace.img.naturalHeight || ippolitFace.img.height;
  const scale = Math.max(w / iw, h / ih) * 1.1;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(ippolitFace.img, x + (w - dw) / 2, y + (h - dh) / 2 - h * 0.06, dw, dh);
  ctx.restore();
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.imageSmoothingQuality = prevQuality;
  ctx.save();
  ctx.strokeStyle = 'rgba(20,14,12,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 0.5, h / 2 - 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return true;
}

/** Glass / plastic bottles — scattered piles. */
export function drawBottleCluster(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  seed = 0,
): void {
  const bottles: readonly [number, number, string, number][] = [
    [0, -18, '#2a4820', 5],
    [6, -22, '#3a6028', 4],
    [11, -16, '#284820', 5],
    [3, -12, '#4a7030', 4],
    [9, -14, '#1a3820', 4],
    [15, -19, '#355828', 5],
    [18, -13, '#486838', 4],
    [-4, -14, '#203820', 4],
  ];
  for (let i = 0; i < bottles.length; i++) {
    const [ox, oy, col, h] = bottles[(i + seed) % bottles.length]!;
    const x = bx + ox + ((seed * 3 + i) % 3);
    const y = by + oy;
    px(ctx, x, y, 4, h, col);
    px(ctx, x + 1, y + 1, 1, h - 2, '#6a8850');
    px(ctx, x + 1, y - 2, 2, 3, '#808890');
    px(ctx, x + 1, y + 2, 2, 2, '#a0c060');
    if ((i + seed) % 3 === 0) {
      px(ctx, x + 20, y - 2, 3, 10, '#687878');
      px(ctx, x + 21, y - 4, 1, 3, '#a0b0b8');
      px(ctx, x + 20, y + 1, 3, 2, '#405058');
    }
  }
}

export function drawBeerCan(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, x - 3, y - 9, 6, 11, '#c89030');
  px(ctx, x - 2, y - 8, 4, 2, '#f0c868');
  px(ctx, x - 2, y - 6, 1, 6, '#e0b050');
  px(ctx, x + 1, y - 6, 1, 6, '#a07020');
  px(ctx, x - 2, y - 10, 4, 2, '#a0a8b0');
  px(ctx, x - 1, y - 10, 2, 1, '#d0d8e0');
  px(ctx, x - 1, y - 4, 2, 3, '#c04040');
  px(ctx, x - 1, y - 3, 2, 1, '#e06060');
}

/** Pack of cigarettes (сигареты). */
export function drawCigarettePack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time = 0,
): void {
  const bob = Math.floor(time * 3) % 2;
  const py = y - bob;
  px(ctx, x - 5, py - 10, 11, 12, '#8a2020');
  px(ctx, x - 4, py - 9, 9, 2, '#c04040');
  px(ctx, x - 4, py - 9, 1, 10, '#a03030');
  px(ctx, x + 4, py - 8, 1, 9, '#601010');
  px(ctx, x - 4, py - 4, 9, 3, '#c8a848');
  px(ctx, x - 3, py - 3, 7, 1, '#e8d070');
  px(ctx, x - 2, py - 7, 5, 2, '#f0e0c0');
  px(ctx, x - 1, py - 6, 3, 1, '#d0b898');
  px(ctx, x - 3, py - 12, 2, 3, '#e8d8b0');
  px(ctx, x, py - 13, 2, 4, '#e8d8b0');
  px(ctx, x + 2, py - 12, 2, 3, '#d0c098');
  px(ctx, x - 3, py - 12, 2, 1, '#c86040');
  px(ctx, x, py - 13, 2, 1, '#c86040');
}

export function drawDoorwayArch(
  ctx: CanvasRenderingContext2D,
  x: number,
  label: string,
): void {
  px(ctx, x - 6, FLOOR_Y - 96, 12, 86, P.wallDeep);
  px(ctx, x - 4, FLOOR_Y - 94, 8, 82, '#1a1828');
  woodGrain(ctx, x - 8, FLOOR_Y - 98, 4, 88, P.woodDark, P.woodHi, P.wood, P.woodDeep, false);
  woodGrain(ctx, x + 4, FLOOR_Y - 98, 4, 88, P.woodDark, P.woodHi, P.wood, P.woodDeep, false);
  woodGrain(ctx, x - 8, FLOOR_Y - 100, 16, 6, P.wood, P.woodHi, P.woodMid, P.woodDark, false);
  ditherRect(ctx, x - 3, FLOOR_Y - 92, 6, 78, '#12101c', '#1c1830');
  const tw = label.length * 3.2;
  drawUiText(ctx, label, x - tw / 2, FLOOR_Y - 108, '#c8b090', 5, 500);
}

/**
 * Туалет: classic Soviet high cast-iron tank + long pull chain + bowl with «полочка».
 * flushT: 0 idle, >0 animating flush.
 */
export function drawToiletRoom(
  ctx: CanvasRenderingContext2D,
  originX: number,
  height: number,
  time: number,
  flushT: number,
  litterClean: boolean,
): void {
  const ox = originX;
  const fy = FLOOR_Y;

  // Narrow tiled WC walls — beige/cream Soviet
  px(ctx, ox, 0, ROOM_W, fy - 10, '#6a6860');
  for (let ty = 18; ty < fy - 40; ty += 11) {
    for (let tx = ox + 6; tx < ox + ROOM_W - 6; tx += 13) {
      const c = ((tx + ty) >> 3) % 2 ? '#c8c0a8' : '#b8b098';
      px(ctx, tx, ty, 11, 9, c);
      px(ctx, tx, ty, 11, 1, '#d8d0b8');
      px(ctx, tx, ty, 1, 9, '#d0c8b0');
      px(ctx, tx + 10, ty + 1, 1, 8, '#908870');
      px(ctx, tx + 1, ty + 8, 9, 1, '#908870');
    }
  }
  greaseStain(ctx, ox + 30, 50, 40, 36, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  greaseStain(ctx, ox + 180, 70, 50, 40, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  speckles(ctx, ox + 10, 24, ROOM_W - 20, fy - 55, 'rgba(40,50,30,0.22)', 16, 4);

  // Floor
  px(ctx, ox, fy - 10, ROOM_W, height - (fy - 10), '#5a5850');
  for (let x = ox; x < ox + ROOM_W; x += 14) {
    px(ctx, x, fy - 10, 13, height - (fy - 10), ((x - ox) / 14) % 2 ? '#6a6860' : '#4a4840');
    px(ctx, x + 13, fy - 10, 1, height - (fy - 10), '#3a3830');
  }
  px(ctx, ox, fy - 12, ROOM_W, 2, '#3a3830');

  // —— High cast-iron cistern near ceiling ——
  const tankX = ox + 150;
  const tankY = 18;
  px(ctx, tankX, tankY, 48, 28, '#3a4038');
  px(ctx, tankX + 2, tankY + 2, 44, 3, '#585850');
  px(ctx, tankX + 2, tankY + 2, 2, 24, '#4a5048');
  px(ctx, tankX + 44, tankY + 3, 2, 22, '#282820');
  // Lid seam + rust
  px(ctx, tankX + 4, tankY + 12, 40, 2, '#2a3028');
  speckles(ctx, tankX, tankY, 48, 28, '#6a4830', 10, 3);
  greaseStain(ctx, tankX + 8, tankY + 14, 28, 10, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  // Water line peek (when not flushing)
  if (flushT <= 0) {
    px(ctx, tankX + 8, tankY + 16, 32, 6, '#405868');
    px(ctx, tankX + 10, tankY + 17, 20, 2, '#608090');
  } else {
    px(ctx, tankX + 8, tankY + 20, 32, 4, '#304858');
  }

  // Vertical flush pipe down to bowl
  const pipeX = tankX + 20;
  px(ctx, pipeX, tankY + 28, 8, fy - 52 - (tankY + 28), '#686870');
  px(ctx, pipeX + 1, tankY + 28, 2, fy - 52 - (tankY + 28), '#888890');
  px(ctx, pipeX + 6, tankY + 30, 1, fy - 54 - (tankY + 30), '#404048');
  speckles(ctx, pipeX, tankY + 40, 8, 60, '#4a4030', 5, 2);

  // Pull chain from tank (pear handle)
  const chainPull = flushT > 0 ? Math.min(10, flushT * 28) : 0;
  const chainTop = tankY + 26;
  const chainBot = fy - 58 + chainPull;
  for (let cy = chainTop; cy < chainBot; cy += 3) {
    px(ctx, tankX + 42, cy, 2, 2, '#a0a8b0');
    px(ctx, tankX + 43, cy + 1, 1, 1, '#d0d8e0');
  }
  // Pear / груша handle
  const hx = tankX + 40;
  const hy = chainBot;
  px(ctx, hx, hy, 6, 8, '#808890');
  px(ctx, hx + 1, hy + 1, 4, 6, '#c0a050');
  px(ctx, hx + 2, hy + 2, 2, 3, '#e0c070');
  px(ctx, hx + 1, hy + 7, 4, 2, '#606870');

  // Bowl with «полочка» (shelf) — ceramic
  const bowlX = ox + 140;
  const bowlY = fy - 40;
  px(ctx, bowlX, bowlY, 44, 30, '#d0d8d8');
  px(ctx, bowlX + 2, bowlY + 2, 40, 4, '#e8f0f0');
  px(ctx, bowlX + 2, bowlY + 2, 2, 26, '#e0e8e8');
  px(ctx, bowlX + 40, bowlY + 4, 2, 24, '#a0a8a8');
  // Inner shelf + water
  px(ctx, bowlX + 6, bowlY + 8, 32, 14, '#687878');
  px(ctx, bowlX + 8, bowlY + 10, 28, 4, '#90a8a8');
  px(ctx, bowlX + 10, bowlY + 16, 24, 4, '#405858');
  // Seat / lid up
  px(ctx, bowlX + 4, bowlY - 4, 36, 5, '#c8c0b0');
  px(ctx, bowlX + 6, bowlY - 14, 32, 12, '#b8b0a0');
  px(ctx, bowlX + 8, bowlY - 12, 28, 2, '#d8d0c0');
  // Base concrete bedding (Soviet install)
  px(ctx, bowlX + 4, bowlY + 28, 36, 6, '#787068');
  px(ctx, bowlX + 6, bowlY + 29, 32, 3, '#908880');
  speckles(ctx, bowlX, bowlY, 44, 34, '#a0a8a8', 6, 1);

  // Flush splash animation
  if (flushT > 0 && flushT < 1.1) {
    const splash = Math.sin(flushT * 14) * 3;
    px(ctx, bowlX + 12, bowlY + 6 - splash, 20, 4, '#a0c8d8');
    px(ctx, bowlX + 14, bowlY + 2, 4, 6, '#c0e0f0');
    px(ctx, bowlX + 24, bowlY + 3, 3, 5, '#b0d8e8');
    // Water rushing down pipe
    px(ctx, pipeX + 2, tankY + 30 + (1.1 - flushT) * 40, 4, 18, '#608898');
  }

  // Newspaper / magazines rack
  px(ctx, ox + 40, fy - 36, 18, 22, '#6a5040');
  px(ctx, ox + 42, fy - 34, 14, 3, '#c04040');
  px(ctx, ox + 42, fy - 28, 14, 3, '#f0e8d0');
  px(ctx, ox + 42, fy - 24, 14, 3, '#405080');

  // —— Cat litter box ——
  drawLitterBox(ctx, LITTER_X, fy, litterClean, time);

  drawBottleCluster(ctx, ox + 20, fy, 9);
  drawBottleCluster(ctx, ox + 240, fy, 2);
  drawDoorwayArch(ctx, ox + ROOM_W - 4, 'комната →');
}

function drawLitterBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  fy: number,
  clean: boolean,
  time: number,
): void {
  const x = cx - 18;
  const y = fy - 16;
  // Plastic tray
  px(ctx, x, y, 36, 12, '#687068');
  px(ctx, x + 1, y + 1, 34, 2, '#889088');
  px(ctx, x + 1, y + 1, 1, 10, '#788078');
  px(ctx, x + 33, y + 2, 1, 9, '#485048');
  // Litter
  if (clean) {
    px(ctx, x + 3, y + 4, 30, 6, '#c8b890');
    px(ctx, x + 5, y + 5, 8, 2, '#d8c8a0');
    speckles(ctx, x + 3, y + 4, 30, 6, '#a09070', 4, 1);
  } else {
    px(ctx, x + 3, y + 4, 30, 6, '#8a7860');
    px(ctx, x + 6, y + 5, 6, 3, '#5a4838');
    px(ctx, x + 16, y + 6, 5, 2, '#4a3828');
    px(ctx, x + 24, y + 5, 4, 3, '#6a5040');
    speckles(ctx, x + 3, y + 4, 30, 6, '#3a2820', 8, 2);
    // Smell lines
    const bob = Math.floor(time * 3) % 3;
    px(ctx, x + 12 + bob, y - 4, 1, 3, '#a0b080');
    px(ctx, x + 18, y - 5 - bob, 1, 3, '#a0b080');
  }
  drawUiText(ctx, clean ? 'лоток' : 'лоток!', x + 2, y - 10, clean ? '#a0a090' : '#e0c070', 5, 500);
}

/** Hi-detail Soviet kitchen — stove, колонка, dishes, dirty fridge. */
export function drawKitchen(
  ctx: CanvasRenderingContext2D,
  originX: number,
  height: number,
  time: number,
): void {
  const ox = originX;
  const fy = FLOOR_Y;

  px(ctx, ox, 0, ROOM_W, fy - 10, '#6a7870');
  for (let ty = 20; ty < fy - 40; ty += 10) {
    for (let tx = ox + 4; tx < ox + ROOM_W - 4; tx += 14) {
      const tint = ((tx + ty) >> 2) % 3;
      const c = tint === 0 ? '#c8d0c0' : tint === 1 ? '#b0b8a8' : '#a8b098';
      px(ctx, tx, ty, 12, 8, c);
      px(ctx, tx, ty, 12, 1, '#d8e0d0');
      px(ctx, tx, ty, 1, 8, '#d0d8c8');
      px(ctx, tx + 11, ty + 1, 1, 7, '#889078');
      px(ctx, tx + 1, ty + 7, 10, 1, '#889078');
    }
  }
  greaseStain(ctx, ox + 40, 50, 36, 28, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  greaseStain(ctx, ox + 180, 70, 42, 22, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  speckles(ctx, ox + 20, 30, ROOM_W - 40, fy - 60, 'rgba(40,36,28,0.25)', 18, 7);

  px(ctx, ox, fy - 10, ROOM_W, height - (fy - 10), '#5a5040');
  for (let x = ox; x < ox + ROOM_W; x += 16) {
    const tone = ((x - ox) / 16) % 2;
    px(ctx, x, fy - 10, 15, height - (fy - 10), tone ? '#6a6050' : '#524838');
    px(ctx, x + 15, fy - 10, 1, height - (fy - 10), '#3a3428');
  }
  px(ctx, ox, fy - 12, ROOM_W, 2, '#3a3428');

  const rx = ox + 230;
  px(ctx, rx, fy - 78, 52, 68, '#6a7078');
  px(ctx, rx + 2, fy - 76, 48, 3, '#8a9098');
  px(ctx, rx + 2, fy - 76, 2, 64, '#7a8088');
  px(ctx, rx + 48, fy - 74, 2, 62, '#4a5058');
  px(ctx, rx + 4, fy - 42, 44, 2, '#3a4048');
  px(ctx, rx + 42, fy - 58, 3, 10, '#a0a8b0');
  px(ctx, rx + 43, fy - 56, 1, 6, '#d0d8e0');
  px(ctx, rx + 10, fy - 70, 8, 6, '#c04040');
  px(ctx, rx + 22, fy - 68, 10, 5, '#f0e8c0');
  px(ctx, rx + 24, fy - 67, 6, 1, '#808890');
  px(ctx, rx + 8, fy - 54, 14, 8, '#405060');
  greaseStain(ctx, rx + 6, fy - 36, 30, 20, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  speckles(ctx, rx + 4, fy - 74, 44, 60, '#3a4038', 14, 11);
  px(ctx, rx + 4, fy - 10, 8, 4, '#3a4048');
  px(ctx, rx + 40, fy - 10, 8, 4, '#3a4048');
  px(ctx, rx + 50, fy - 50, 1, 12, '#687878');
  px(ctx, rx + 49, fy - 38, 2, 2, '#809090');

  const sx = ox + 40;
  px(ctx, sx, fy - 42, 70, 32, '#4a4a58');
  px(ctx, sx + 2, fy - 40, 66, 2, '#686878');
  px(ctx, sx + 2, fy - 40, 2, 28, '#585868');
  px(ctx, sx + 66, fy - 38, 2, 26, '#303038');
  px(ctx, sx + 4, fy - 52, 62, 12, '#2a2a38');
  px(ctx, sx + 5, fy - 51, 60, 2, '#484858');
  for (const bx of [sx + 12, sx + 28, sx + 44]) {
    px(ctx, bx, fy - 50, 10, 8, '#181820');
    px(ctx, bx + 2, fy - 48, 6, 4, '#303040');
    px(ctx, bx + 3, fy - 47, 4, 2, '#505060');
    px(ctx, bx + 1, fy - 49, 8, 1, '#8a4830');
  }
  for (let i = 0; i < 4; i++) {
    px(ctx, sx + 10 + i * 14, fy - 28, 6, 6, '#808890');
    px(ctx, sx + 11 + i * 14, fy - 27, 4, 2, '#c0c8d0');
    px(ctx, sx + 12 + i * 14, fy - 25, 2, 2, '#404850');
  }
  px(ctx, sx + 14, fy - 22, 28, 12, '#1a1820');
  px(ctx, sx + 16, fy - 20, 24, 8, '#282030');
  px(ctx, sx + 18, fy - 18, 8, 3, '#403848');
  greaseStain(ctx, sx + 8, fy - 38, 40, 16, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  speckles(ctx, sx, fy - 52, 70, 40, '#2a2018', 10, 2);

  px(ctx, sx + 20, fy - 60, 14, 10, '#505860');
  px(ctx, sx + 22, fy - 58, 10, 2, '#708090');
  px(ctx, sx + 18, fy - 56, 3, 2, '#404850');
  px(ctx, sx + 33, fy - 56, 3, 2, '#404850');
  const steam = Math.floor(time * 4) % 3;
  px(ctx, sx + 24 + steam, fy - 66, 2, 4, '#a0b0b8');
  px(ctx, sx + 28, fy - 68 - steam, 2, 3, '#809098');

  const kx = ox + 130;
  px(ctx, kx, fy - 100, 36, 52, '#b8a070');
  px(ctx, kx + 2, fy - 98, 32, 3, '#d0c090');
  px(ctx, kx + 2, fy - 98, 2, 48, '#c8b888');
  px(ctx, kx + 32, fy - 96, 2, 46, '#8a7850');
  px(ctx, kx + 8, fy - 88, 20, 16, '#2a2830');
  px(ctx, kx + 10, fy - 86, 16, 12, '#3a3848');
  px(ctx, kx + 12, fy - 84, 6, 4, '#c06030');
  px(ctx, kx + 18, fy - 82, 4, 3, '#e08040');
  const fl = Math.floor(time * 8) % 2;
  px(ctx, kx + 16, fy - 78 - fl, 3, 3 + fl, '#f0c060');
  px(ctx, kx + 10, fy - 66, 6, 6, '#808890');
  px(ctx, kx + 20, fy - 66, 6, 6, '#808890');
  px(ctx, kx + 14, fy - 48, 8, 4, '#606870');
  px(ctx, kx + 16, fy - 44, 4, 8, '#505860');
  px(ctx, kx + 12, fy - 112, 12, 14, '#686870');
  px(ctx, kx + 14, fy - 120, 8, 10, '#585860');
  px(ctx, kx + 15, fy - 118, 6, 2, '#808890');
  speckles(ctx, kx, fy - 100, 36, 52, '#6a5838', 8, 9);
  drawUiText(ctx, 'колонка', kx - 2, fy - 126, '#a09070', 5, 500);

  const wx = ox + 160;
  woodGrain(ctx, wx, fy - 36, 58, 26, '#6a6058', '#8a8070', '#7a7068', '#4a4038', false);
  px(ctx, wx + 4, fy - 40, 50, 8, '#687078');
  px(ctx, wx + 6, fy - 38, 46, 5, '#405058');
  px(ctx, wx + 8, fy - 37, 10, 3, '#586870');
  px(ctx, wx + 28, fy - 52, 4, 12, '#808890');
  px(ctx, wx + 24, fy - 54, 12, 3, '#a0a8b0');
  px(ctx, wx + 34, fy - 50, 6, 2, '#808890');
  const dishes: readonly [number, number, number, number, string][] = [
    [wx + 6, fy - 46, 16, 3, '#d0d0c8'],
    [wx + 10, fy - 49, 14, 3, '#c0c0b8'],
    [wx + 8, fy - 52, 12, 3, '#e0e0d0'],
    [wx + 22, fy - 48, 8, 8, '#a0b0c0'],
    [wx + 30, fy - 50, 7, 6, '#c08070'],
    [wx + 38, fy - 47, 12, 4, '#909898'],
    [wx + 14, fy - 55, 10, 3, '#d8d0c0'],
    [wx + 40, fy - 54, 6, 8, '#708090'],
    [wx + 18, fy - 58, 8, 4, '#b0a090'],
  ];
  for (const [dx, dy, dw, dh, col] of dishes) {
    px(ctx, dx, dy, dw, dh, col);
    px(ctx, dx + 1, dy, dw - 2, 1, '#f0f0e8');
  }
  greaseStain(ctx, wx + 6, fy - 42, 40, 10, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);

  woodGrain(ctx, ox + 100, fy - 28, 48, 6, P.wood, P.woodHi, P.woodMid, P.woodDark, false);
  px(ctx, ox + 104, fy - 22, 4, 12, P.woodDark);
  px(ctx, ox + 140, fy - 22, 4, 12, P.woodDark);

  px(ctx, ox + 8, 28, 28, 36, '#2a3040');
  px(ctx, ox + 10, 30, 24, 32, '#1a2438');
  px(ctx, ox + 6, 26, 6, 40, '#c8a858');
  px(ctx, ox + 32, 26, 6, 40, '#c8a858');
  px(ctx, ox + 6, 24, 32, 4, '#a88840');

  drawBottleCluster(ctx, ox + 20, fy, 1);
  drawBottleCluster(ctx, ox + 200, fy, 4);
  drawBottleCluster(ctx, ox + 110, fy - 6, 2);

  drawDoorwayArch(ctx, ox + 4, '← комната');
  drawDoorwayArch(ctx, ox + ROOM_W - 4, 'ванная →');
}

/** Old Soviet bathroom + Ippolit in the tub. */
export function drawBathroom(
  ctx: CanvasRenderingContext2D,
  originX: number,
  height: number,
  time: number,
  spoke: boolean,
  bathed: boolean,
): void {
  const ox = originX;
  const fy = FLOOR_Y;

  px(ctx, ox, 0, ROOM_W, fy - 10, '#5a6870');
  for (let ty = 16; ty < fy - 36; ty += 12) {
    for (let tx = ox + 4; tx < ox + ROOM_W - 4; tx += 12) {
      const c = ((tx + ty) >> 3) % 2 ? '#b8c8c8' : '#a8b8b8';
      px(ctx, tx, ty, 10, 10, c);
      px(ctx, tx, ty, 10, 1, '#d0e0e0');
      px(ctx, tx, ty, 1, 10, '#d0e0e0');
      px(ctx, tx + 9, ty + 1, 1, 9, '#789090');
      px(ctx, tx + 1, ty + 9, 8, 1, '#789090');
    }
  }
  greaseStain(ctx, ox + 40, 40, 50, 40, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  greaseStain(ctx, ox + 200, 60, 40, 50, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  speckles(ctx, ox + 10, 20, ROOM_W - 20, fy - 50, 'rgba(30,50,40,0.3)', 22, 5);

  px(ctx, ox, fy - 10, ROOM_W, height - (fy - 10), '#4a5858');
  for (let x = ox; x < ox + ROOM_W; x += 14) {
    px(ctx, x, fy - 10, 13, height - (fy - 10), ((x - ox) / 14) % 2 ? '#5a6868' : '#405050');
    px(ctx, x + 13, fy - 10, 1, height - (fy - 10), '#304040');
  }
  ctx.fillStyle = 'rgba(160,200,210,0.12)';
  ctx.fillRect(ox + 40, fy - 4, 80, 3);
  ctx.fillRect(ox + 160, fy, 60, 2);
  px(ctx, ox, fy - 12, ROOM_W, 2, '#304040');

  px(ctx, ox + 20, fy - 48, 36, 18, '#909898');
  px(ctx, ox + 22, fy - 46, 32, 12, '#687078');
  px(ctx, ox + 34, fy - 58, 4, 12, '#808890');
  px(ctx, ox + 30, fy - 60, 12, 3, '#a0a8b0');
  px(ctx, ox + 24, fy - 90, 28, 28, '#3a4850');
  px(ctx, ox + 26, fy - 88, 24, 24, '#708898');
  px(ctx, ox + 28, fy - 86, 8, 6, '#a0b8c8');
  px(ctx, ox + 38, fy - 80, 6, 8, '#8098a8');

  // Laundry basket / towel hook (no second toilet — dedicated WC to the left)
  px(ctx, ox + 250, fy - 32, 28, 22, '#6a5848');
  px(ctx, ox + 252, fy - 30, 24, 4, '#8a7868');
  px(ctx, ox + 254, fy - 24, 20, 10, '#c8c0b0');
  px(ctx, ox + 256, fy - 22, 16, 2, '#e0d8c8');

  const bx = ox + 90;
  const by = fy - 8;
  px(ctx, bx, by - 28, 110, 28, '#8a9098');
  px(ctx, bx + 2, by - 26, 106, 4, '#a8b0b8');
  px(ctx, bx + 2, by - 26, 3, 24, '#989ea8');
  px(ctx, bx + 105, by - 24, 3, 22, '#606870');
  px(ctx, bx + 6, by - 22, 98, 18, bathed ? '#5a8898' : '#4a6878');
  px(ctx, bx + 8, by - 20, 94, 4, '#6a8898');
  px(ctx, bx + 10, by - 16, 40, 2, '#8ab0c0');
  px(ctx, bx + 8, by - 2, 10, 4, '#505860');
  px(ctx, bx + 92, by - 2, 10, 4, '#505860');
  px(ctx, bx + 40, by - 70, 6, 20, '#808890');
  px(ctx, bx + 36, by - 74, 14, 6, '#a0a8b0');
  px(ctx, bx + 38, by - 78, 10, 4, '#686870');
  px(ctx, bx + 90, by - 36, 12, 4, '#c0a070');
  px(ctx, bx + 92, by - 38, 8, 2, '#e0c090');

  drawIppolitInTub(ctx, bx + 55, by - 10, time, spoke);

  if (bathed) {
    drawUiText(ctx, 'помылся', bx + 30, by - 42, '#c0e0d0', 5, 500);
  }

  drawBottleCluster(ctx, ox + 30, fy, 6);
  drawBottleCluster(ctx, ox + 210, fy, 3);
  drawBottleCluster(ctx, ox + 160, fy - 4, 8);
  px(ctx, bx + 8, by - 34, 4, 10, '#2a4820');
  px(ctx, bx + 9, by - 36, 2, 3, '#808890');
  px(ctx, bx + 96, by - 32, 4, 8, '#3a6028');
  px(ctx, bx + 97, by - 34, 2, 3, '#808890');

  drawDoorwayArch(ctx, ox + 4, '← кухня');
}

function drawIppolitInTub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  spoke: boolean,
): void {
  const bob = Math.sin(time * 2.2) * 1.2;
  const y = cy + bob;

  px(ctx, cx - 22, y - 26, 44, 22, '#2a3040');
  px(ctx, cx - 20, y - 24, 40, 4, '#3a4858');
  px(ctx, cx - 20, y - 24, 2, 18, '#404858');
  px(ctx, cx + 18, y - 22, 2, 16, '#1a2030');
  px(ctx, cx - 8, y - 24, 6, 10, '#485060');
  px(ctx, cx + 2, y - 24, 6, 10, '#485060');
  speckles(ctx, cx - 20, y - 24, 40, 18, '#1a2430', 6, 1);

  px(ctx, cx - 28, y - 20, 10, 5, '#e0b898');
  px(ctx, cx + 18, y - 20, 10, 5, '#e0b898');
  px(ctx, cx - 26, y - 19, 6, 2, '#f0d0b0');
  px(ctx, cx + 20, y - 19, 6, 2, '#f0d0b0');

  px(ctx, cx - 12, y - 48, 24, 10, '#3a3028');
  px(ctx, cx - 10, y - 50, 20, 4, '#4a4038');
  px(ctx, cx - 14, y - 44, 6, 8, '#5a5048');
  px(ctx, cx + 8, y - 44, 6, 8, '#5a5048');
  px(ctx, cx - 8, y - 46, 16, 3, '#6a6058');

  const fw = 16;
  const fh = 18;
  const fx = cx - fw / 2;
  const faceY = y - 44;
  if (!drawIppolitFace(ctx, fx, faceY, fw, fh)) {
    px(ctx, fx, faceY, fw, fh, '#e8c8a8');
    px(ctx, fx + 2, faceY + 2, fw - 4, 4, '#f0d8b8');
    px(ctx, fx + 3, faceY + 7, 3, 2, '#303038');
    px(ctx, fx + 10, faceY + 7, 3, 2, '#303038');
    px(ctx, fx + 6, faceY + 10, 4, 2, '#c09080');
    px(ctx, fx + 4, faceY + 13, 8, 2, '#d0a898');
  }

  px(ctx, cx - 18, y - 8, 36, 2, '#8ab0c0');
  px(ctx, cx - 14, y - 5, 28, 1, '#6a8898');

  if (!spoke) {
    const pulse = 0.65 + Math.sin(time * 3) * 0.2;
    ctx.save();
    ctx.globalAlpha = pulse;
    px(ctx, cx + 20, y - 56, 28, 12, 'rgba(12,14,20,0.82)');
    drawUiText(ctx, 'спинку…', cx + 23, y - 52, '#f0e8d0', 5, 550);
    ctx.restore();
  }
}

/** Extra bottles in living room (world coords with ROOM_ORIGIN). */
export function drawRoomBottles(ctx: CanvasRenderingContext2D, roomOrigin: number): void {
  drawBottleCluster(ctx, roomOrigin + 28, FLOOR_Y, 0);
  drawBottleCluster(ctx, roomOrigin + 150, FLOOR_Y, 5);
  drawBottleCluster(ctx, roomOrigin + 280, FLOOR_Y - 2, 7);
  px(ctx, roomOrigin + 220, FLOOR_Y - 50, 4, 12, '#2a4820');
  px(ctx, roomOrigin + 221, FLOOR_Y - 52, 2, 3, '#808890');
  px(ctx, roomOrigin + 226, FLOOR_Y - 48, 4, 10, '#3a6028');
  px(ctx, roomOrigin + 227, FLOOR_Y - 50, 2, 3, '#808890');
  px(ctx, roomOrigin + 232, FLOOR_Y - 52, 3, 11, '#687878');
  px(ctx, roomOrigin + 233, FLOOR_Y - 54, 1, 3, '#a0b0b8');
}
