/**
 * Photo-quality System of a Down «Aerials» wall poster for Apartment2026.
 * Face art: public/art/aerials-poster.png (bundled via Vite public/).
 */

import { px } from '@/art/pixelDraw';
import { APT_PAL } from '@/art/segaPalette';

const POSTER_URL = `${import.meta.env.BASE_URL}art/aerials-poster.png`;

let posterImg: HTMLImageElement | null = null;
let posterReady = false;
let loadStarted = false;

/** Kick off async load (idempotent). Call on apartment enter / first draw. */
export function preloadAerialsPoster(): void {
  if (loadStarted) return;
  loadStarted = true;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    posterReady = true;
  };
  img.onerror = () => {
    posterReady = false;
  };
  img.src = POSTER_URL;
  posterImg = img;
}

/**
 * Framed photo poster on free wall between lamp and window.
 * Uses high-quality smoothing for the photo face; restores crisp pixel mode after.
 */
export function drawAerialsPoster(ctx: CanvasRenderingContext2D): void {
  preloadAerialsPoster();

  // Landscape frame matching source ~2.15:1; clear of HUD corners & window.
  const x = 124;
  const y = 12;
  const w = 74;
  const h = 40;

  // Drop shadow + black frame + mat (hi-detail room style)
  px(ctx, x + 3, y + 3, w, h, '#2a2018');
  px(ctx, x, y, w, h, '#0c0c12');
  px(ctx, x + 1, y + 1, w - 2, h - 2, '#1a1420');
  px(ctx, x + 2, y + 2, w - 4, h - 4, '#d8c8a0');
  px(ctx, x + 3, y + 3, w - 6, 1, '#f0e8c8');
  px(ctx, x + 3, y + 3, 1, h - 6, '#e8d8b0');
  px(ctx, x + w - 4, y + 3, 1, h - 6, '#a89870');
  px(ctx, x + 3, y + h - 4, w - 6, 1, '#988868');

  const ix = x + 4;
  const iy = y + 4;
  const iw = w - 8;
  const ih = h - 8;

  if (posterReady && posterImg) {
    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevQuality = ctx.imageSmoothingQuality;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(posterImg, ix, iy, iw, ih);
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.imageSmoothingQuality = prevQuality;
  } else {
    // Dark mat while loading — no English debug text
    px(ctx, ix, iy, iw, ih, '#141018');
  }

  // Masking tape / wear on corners
  px(ctx, x + 3, y + 3, 5, 3, '#d0c090');
  px(ctx, x + w - 8, y + 3, 5, 3, '#d0c090');
  px(ctx, x + 3, y + h - 6, 5, 3, '#c8b888');
  px(ctx, x + w - 6, y + h - 5, 3, 2, APT_PAL.wallBase);
}
