/**
 * Soviet CRT TV for Level 2 father / graduation room.
 * Screen: B&W «17 мгновений весны» (Stierlitz) → after 5s color Putin NY address.
 */

import { greaseStain, px, speckles } from '@/art/pixelDraw';
import { drawUiText } from '@/art/uiFont';
import { APT_PAL } from '@/art/segaPalette';

const BASE = import.meta.env.BASE_URL;
const P = APT_PAL;

/** Seconds on Stierlitz still before switching to Putin. */
export const FATHER_TV_SWITCH_SEC = 5;

export type FatherTvScreen = 'stierlitz' | 'putin';

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<FatherTvScreen, Slot> = {
  stierlitz: { url: `${BASE}art/tv-stierlitz.jpg`, img: null, ready: false },
  putin: { url: `${BASE}art/tv-putin.jpg`, img: null, ready: false },
};

let loadStarted = false;

function ensureSlot(key: FatherTvScreen): void {
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
export function preloadFatherTv(): void {
  if (loadStarted) return;
  loadStarted = true;
  ensureSlot('stierlitz');
  ensureSlot('putin');
}

export function fatherTvScreenAt(t: number): FatherTvScreen {
  return t < FATHER_TV_SWITCH_SEC ? 'stierlitz' : 'putin';
}

/** CRT cabinet origin (top-left of plastic shell). */
export const FATHER_TV_X = 272;
export const FATHER_TV_Y = 118;

function drawScreenPhoto(
  ctx: CanvasRenderingContext2D,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
  key: FatherTvScreen,
): void {
  ensureSlot(key);
  const slot = slots[key]!;
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
    // CRT glass + scanline wash
    ctx.fillStyle =
      key === 'stierlitz'
        ? 'rgba(20, 24, 28, 0.18)'
        : 'rgba(12, 20, 28, 0.12)';
    ctx.fillRect(ix, iy, iw, ih);
    for (let sy = iy; sy < iy + ih; sy += 2) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      ctx.fillRect(ix, sy, iw, 1);
    }
    // Soft vignette corners
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(ix, iy, 2, ih);
    ctx.fillRect(ix + iw - 2, iy, 2, ih);
    ctx.fillRect(ix, iy, iw, 1);
    ctx.fillRect(ix, iy + ih - 1, iw, 1);
    ctx.restore();
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.imageSmoothingQuality = prevQuality;
  } else {
    px(ctx, ix, iy, iw, ih, key === 'stierlitz' ? '#2a3038' : '#183048');
  }
}

/**
 * Draw beige Soviet CRT on a low stand (right wall). Father faces this set.
 * @param t scene time seconds since enter — drives 5s Stierlitz → Putin switch
 */
export function drawFatherTv(ctx: CanvasRenderingContext2D, t: number): void {
  preloadFatherTv();

  const x = FATHER_TV_X;
  const y = FATHER_TV_Y;
  const w = 42;
  const h = 36;
  const screen = fatherTvScreenAt(t);

  // Drop shadow
  px(ctx, x + 3, y + 4, w, h + 10, 'rgba(16,12,10,0.38)');

  // Plastic shell (beige / nicotine)
  px(ctx, x, y, w, h, '#b8a878');
  px(ctx, x + 1, y + 1, w - 2, 2, '#d0c098');
  px(ctx, x + 1, y + 1, 2, h - 2, '#c8b888');
  px(ctx, x + w - 3, y + 2, 2, h - 3, '#8a7850');
  px(ctx, x + 2, y + h - 3, w - 4, 2, '#7a6840');

  // Inner bezel
  px(ctx, x + 3, y + 4, w - 10, h - 12, '#3a3428');
  px(ctx, x + 4, y + 5, w - 12, h - 14, '#1a1814');

  const ix = x + 5;
  const iy = y + 6;
  const iw = w - 14;
  const ih = h - 16;
  drawScreenPhoto(ctx, ix, iy, iw, ih, screen);

  // Right control strip (knobs / speaker grille)
  px(ctx, x + w - 9, y + 6, 6, h - 14, '#a89868');
  px(ctx, x + w - 8, y + 8, 3, 3, '#686058');
  px(ctx, x + w - 7, y + 9, 1, 1, '#c0b090');
  px(ctx, x + w - 8, y + 14, 3, 3, '#686058');
  px(ctx, x + w - 7, y + 15, 1, 1, '#c0b090');
  for (let gy = y + 20; gy < y + h - 8; gy += 2) {
    px(ctx, x + w - 8, gy, 4, 1, '#6a6048');
  }

  // Brand badge
  px(ctx, x + 12, y + h - 5, 10, 2, '#908060');

  // Rabbit-ear antenna
  px(ctx, x + 10, y - 10, 1, 10, '#686878');
  px(ctx, x + 28, y - 10, 1, 10, '#686878');
  px(ctx, x + 8, y - 11, 5, 1, '#808890');
  px(ctx, x + 26, y - 11, 5, 1, '#808890');
  px(ctx, x + 18, y - 2, 4, 2, '#585868');

  // Wooden stand / тумба
  const sx = x + 2;
  const sy = y + h;
  const sw = w - 4;
  const sh = 14;
  px(ctx, sx, sy, sw, sh, '#5a4830');
  px(ctx, sx + 1, sy + 1, sw - 2, 2, '#8a7048');
  px(ctx, sx + 1, sy + 1, 2, sh - 2, '#7a6240');
  px(ctx, sx + sw - 3, sy + 2, 2, sh - 3, '#3a2c18');
  px(ctx, sx + 4, sy + 5, sw - 8, 6, '#4a3820');
  px(ctx, sx + Math.floor(sw / 2) - 3, sy + 7, 6, 2, '#c0a050');
  speckles(ctx, sx, sy, sw, sh, 'rgba(30,22,12,0.35)', 6, 41);
  greaseStain(ctx, sx + sw - 10, sy + sh - 5, 7, 4, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);

  // Tiny caption while Stierlitz is on (fades out before switch)
  if (screen === 'stierlitz') {
    const fade = Math.max(0, Math.min(1, 1 - (t - 2.2) / 1.6));
    if (fade > 0.05) {
      const label = '17 мгновений весны';
      const alpha = Math.round(fade * 220);
      drawUiText(
        ctx,
        label,
        x - 2,
        y + h + sh + 2,
        `rgba(232,220,180,${(alpha / 255).toFixed(2)})`,
        5.5,
        500,
      );
    }
  }
}
