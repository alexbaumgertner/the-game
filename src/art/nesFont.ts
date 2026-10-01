/**
 * Chunky 5×7 NES-style bitmap font (A–Z, 0–9, punctuation).
 * Drawn as solid pixels — no CSS font dependency for HUD chrome.
 */

import { blitGrid } from './pixelDraw';

/** Each glyph is 5 columns × 7 rows; 1 = ink, 0 = empty. Packed as 35 bits in a string of 0/1. */
const GLYPHS: Record<string, string> = {
  ' ': '00000000000000000000000000000000000',
  A: '01110100011000111111100011000110001',
  B: '11110100011111010001100011111000000',
  C: '01111100001000010000100000111100000',
  D: '11110100011000110001100011111000000',
  E: '11111100001111010000100001111100000',
  F: '11111100001111010000100001000000000',
  G: '01111100001000010111100010111100000',
  H: '10001100011111110001100011000100000',
  I: '11111001000010000100001001111100000',
  J: '00111000100001000010000101111000000',
  K: '10001100101110010100100101000100000',
  L: '10000100001000010000100001111100000',
  M: '10001110111010110001100011000100000',
  N: '10001110011010110011100011000100000',
  O: '01110100011000110001100010111000000',
  P: '11110100011111010000100001000000000',
  Q: '01110100011000110001101010111100001',
  R: '11110100011111010010100101000100000',
  S: '01111100000111000001000011111000000',
  T: '11111001000010000100001000010000000',
  U: '10001100011000110001100010111000000',
  V: '10001100011000101010010100010000000',
  W: '10001100011000110101110111000100000',
  X: '10001010100010001010010101000100000',
  Y: '10001010100010000100001000010000000',
  Z: '11111000100010001000100001111100000',
  '0': '01110100111000110001100110111000000',
  '1': '00100011000010000100001001111100000',
  '2': '01110100010000100100010001111100000',
  '3': '11110000010111000001100011111000000',
  '4': '10010100101001011111000100001000000',
  '5': '11111100001111000001100011111000000',
  '6': '01111100001111010001100010111000000',
  '7': '11111000010001000100010001000000000',
  '8': '01110100010111010001100010111000000',
  '9': '01110100011000101111000011111000000',
  '.': '00000000000000000000000000110001100',
  ',': '00000000000000000000001100010001000',
  '!': '00100001000010000100000000010000000',
  '?': '01110100010000100100000000010000000',
  ':': '00000001000000000000001000000000000',
  '-': '00000000000111110000000000000000000',
  '/': '00001000100010001000100010000000000',
  '·': '00000000000010000100000000000000000',
  '>': '00000010000010000010000100000000000',
  '<': '00000100000100000100000010000000000',
  "'": '00100001000000000000000000000000000',
  '←': '00100011001111100110001000000000000',
  '→': '00100001101111101100001000000000000',
};

const GW = 5;
const GH = 7;

export function measureNesText(text: string, scale = 1, tracking = 1): number {
  const s = Math.max(1, Math.round(scale));
  const gap = Math.max(1, Math.round(tracking)) * s;
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) w += gap;
    w += GW * s;
  }
  return w;
}

/**
 * Draw uppercase NES bitmap text. Unknown glyphs become space.
 * Returns width drawn.
 */
export function drawNesText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
  tracking = 1,
): number {
  const s = Math.max(1, Math.round(scale));
  const gap = Math.max(1, Math.round(tracking)) * s;
  let cx = Math.round(x);
  const cy = Math.round(y);
  const upper = text.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i]!;
    const raw = GLYPHS[ch] ?? GLYPHS[' ']!;
    const pixels: Array<string | null> = [];
    for (let p = 0; p < GW * GH; p++) {
      pixels.push(raw[p] === '1' ? color : null);
    }
    blitGrid(ctx, cx, cy, GW, GH, pixels, s);
    cx += GW * s + gap;
  }
  return cx - Math.round(x);
}

export function drawNesTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  color: string,
  scale = 1,
  tracking = 1,
): void {
  const w = measureNesText(text, scale, tracking);
  drawNesText(ctx, text, Math.round(centerX - w / 2), y, color, scale, tracking);
}
