/**
 * High-detail Detinets fortress-tavern hall plate for Level 8 «Детинец».
 * Source: public/art/detinets-view-hall.jpg
 * Drawn as a slow far backdrop; wall walk / platforms stay procedural.
 */

import { px } from '@/art/pixelDraw';
import { DETINETS_PAL } from '@/art/segaPalette';

const BASE = import.meta.env.BASE_URL;

export type DetinetsViewId = 'hall';

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<DetinetsViewId, Slot> = {
  hall: { url: `${BASE}art/detinets-view-hall.jpg`, img: null, ready: false },
};

let loadStarted = false;

function ensure(id: DetinetsViewId): void {
  const slot = slots[id];
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

/** Idempotent preload — call from bootstrap / scene enter. */
export function preloadDetinetsHallViews(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const id of Object.keys(slots) as DetinetsViewId[]) ensure(id);
}

export function detinetsHallViewsReady(): boolean {
  preloadDetinetsHallViews();
  return slots.hall.ready;
}

function withSmooth(ctx: CanvasRenderingContext2D, draw: () => void): void {
  const prevSmooth = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  draw();
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.imageSmoothingQuality = prevQuality;
}

function drawPlateCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  pan01: number,
  biasY = 0,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw < 1 || ih < 1) return;
  const overscan = 1.1;
  const scale = Math.max((dw * overscan) / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const maxSx = Math.max(0, iw - sw);
  const sx = maxSx * Math.max(0, Math.min(1, pan01));
  let sy = (ih - sh) / 2 + biasY * ih;
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Caption for HUD chip when the hall plate is up. */
export function detinetsViewCaption(_progress = 0): string {
  return 'Зал · Детинец · свечи';
}

/**
 * Far kremlin-hall backdrop: warm tavern plate with night wash.
 * Drawn in a band above the ground so wall/sprites stay readable.
 * `progress` 0→1 as the camera travels the courtyard → wall.
 */
export function drawDetinetsHallBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time = 0,
): void {
  preloadDetinetsHallViews();

  const p = Math.max(0, Math.min(1, progress));
  const P = DETINETS_PAL;
  // Leave lower ground band for snow / platforms (~GROUND_Y 200 on 224)
  const bandH = Math.min(height, Math.floor(height * 0.9));

  // Fallback procedural night sky while plate loads
  px(ctx, 0, 0, width, bandH, P.skyTop);
  px(ctx, 0, Math.floor(bandH * 0.45), width, bandH, P.skyMid);

  if (!detinetsHallViewsReady()) return;

  const slot = slots.hall;
  const img = slot.img;
  if (!img || !slot.ready) return;

  const pan = (p * 0.42 + Math.sin(time * 0.28) * 0.008) % 1;
  const flicker = 0.5 + 0.5 * Math.sin(time * 4.1);

  withSmooth(ctx, () => {
    // Bias slightly up — keep chandelier / loft, crop busy floor a touch
    drawPlateCover(ctx, img, -4, 0, width + 8, bandH, pan, -0.04);

    // Warm candle wash → cool snow night at the ground seam
    const wash = ctx.createLinearGradient(0, 0, 0, bandH);
    wash.addColorStop(0, `rgba(48, 28, 16, ${0.18 + flicker * 0.04})`);
    wash.addColorStop(0.55, 'rgba(24, 18, 20, 0.12)');
    wash.addColorStop(0.82, 'rgba(12, 16, 28, 0.35)');
    wash.addColorStop(1, 'rgba(8, 12, 22, 0.72)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, bandH);

    // Soft side vignette so wall sprites read
    const side = ctx.createLinearGradient(0, 0, width, 0);
    side.addColorStop(0, 'rgba(8, 10, 18, 0.3)');
    side.addColorStop(0.16, 'rgba(8, 10, 18, 0)');
    side.addColorStop(0.84, 'rgba(8, 10, 18, 0)');
    side.addColorStop(1, 'rgba(8, 10, 18, 0.3)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, width, bandH);
  });
}
