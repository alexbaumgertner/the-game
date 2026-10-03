/**
 * Photo-quality framed Solaris stills for Level 2 father / graduation room.
 * Faces: public/art/father-room-window.jpg, father-room-house.jpg
 */

import { greaseStain, px, speckles, woodGrain } from '@/art/pixelDraw';
import { APT_PAL } from '@/art/segaPalette';

const BASE = import.meta.env.BASE_URL;
const P = APT_PAL;

type PhotoSlot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<'window' | 'house', PhotoSlot> = {
  window: { url: `${BASE}art/father-room-window.jpg`, img: null, ready: false },
  house: { url: `${BASE}art/father-room-house.jpg`, img: null, ready: false },
};

let loadStarted = false;

function ensureSlot(key: keyof typeof slots): void {
  const slot = slots[key]!;
  if (slot.img) return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    slot.ready = true;
  };
  img.onerror = () => {
    slot.ready = false;
  };
  img.src = slot.url;
  slot.img = img;
}

/** Idempotent preload for graduation room enter / first draw. */
export function preloadFatherRoomPhotos(): void {
  if (loadStarted) return;
  loadStarted = true;
  ensureSlot('window');
  ensureSlot('house');
}

function drawHiDetailFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  slotKey: keyof typeof slots,
  seed: number,
): void {
  ensureSlot(slotKey);
  const slot = slots[slotKey]!;

  // Drop shadow into damask wallpaper
  px(ctx, x + 3, y + 3, w, h, 'rgba(20,16,12,0.42)');

  // Outer wood moulding
  woodGrain(ctx, x, y, w, h, '#5a4830', '#8a7048', '#6e5838', '#3a2c18', false);
  px(ctx, x, y, w, 2, '#a88858');
  px(ctx, x, y, 2, h, '#9a7850');
  px(ctx, x + w - 2, y + 1, 2, h - 1, '#3a2814');
  px(ctx, x + 1, y + h - 2, w - 1, 2, '#2a1c10');

  // Mid bevel
  px(ctx, x + 2, y + 2, w - 4, h - 4, '#7a6240');
  px(ctx, x + 2, y + 2, w - 4, 1, '#c0a070');
  px(ctx, x + 2, y + 2, 1, h - 4, '#b09060');
  px(ctx, x + w - 3, y + 3, 1, h - 5, '#4a3820');
  px(ctx, x + 3, y + h - 3, w - 5, 1, '#403018');

  // Inner mat / rabbet
  px(ctx, x + 4, y + 4, w - 8, h - 8, '#2a2014');
  px(ctx, x + 5, y + 5, w - 10, h - 10, '#1a1410');
  px(ctx, x + 5, y + 5, w - 10, 1, '#4a3828');
  px(ctx, x + 5, y + 5, 1, h - 10, '#3a2c20');

  const ix = x + 6;
  const iy = y + 6;
  const iw = w - 12;
  const ih = h - 12;

  if (slot.ready && slot.img) {
    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevQuality = ctx.imageSmoothingQuality;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const nw = slot.img.naturalWidth || slot.img.width;
    const nh = slot.img.naturalHeight || slot.img.height;
    const scale = Math.max(iw / nw, ih / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const dx = ix + (iw - dw) / 2;
    const dy = iy + (ih - dh) / 2;
    ctx.drawImage(slot.img, dx, dy, dw, dh);
    // Soft evening wash — matches graduation lamp light
    ctx.fillStyle = 'rgba(40, 28, 18, 0.10)';
    ctx.fillRect(ix, iy, iw, ih);
    ctx.restore();
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.imageSmoothingQuality = prevQuality;
  } else {
    px(ctx, ix, iy, iw, ih, '#3a4038');
    px(ctx, ix + 6, iy + 4, iw - 12, ih - 8, '#4a5858');
  }

  speckles(ctx, x + 1, y + 1, w - 2, h - 2, 'rgba(30,22,12,0.28)', 8, seed);
  greaseStain(
    ctx,
    x + w - 12,
    y + h - 9,
    8,
    5,
    P.wallStainDeep,
    P.wallStainMid,
    P.wallStainEdge,
  );
  // Brass hanging nail
  px(ctx, x + Math.floor(w / 2) - 1, y - 2, 2, 2, '#c0a050');
  px(ctx, x + Math.floor(w / 2), y - 1, 1, 3, '#808890');
}

/**
 * Two large hi-detail framed photos on the graduation-room wall
 * (Kelvin rainy window + prodigal-son porch — Solaris stills).
 */
export function drawFatherRoomWallPhotos(ctx: CanvasRenderingContext2D): void {
  preloadFatherRoomPhotos();

  // Below banner, left of father — Kelvin at rainy window (landscape)
  drawHiDetailFrame(ctx, 102, 48, 52, 30, 'window', 11);
  // Center wall toward father — house porch / return (landscape)
  drawHiDetailFrame(ctx, 164, 46, 56, 34, 'house', 17);
}
