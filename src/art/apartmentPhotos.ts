/**
 * Photo-quality apartment assets: family portrait, wallpaper tile,
 * and Park 30th Anniversary of October window-parade cutouts.
 * Sources live in public/art/ (bundled via Vite public/).
 */

import { px } from '@/art/pixelDraw';
import { drawMdWallpaper } from '@/art/mdTiles';
import { APT_PAL } from '@/art/segaPalette';
import { drawUiTextCentered, measureUiText } from '@/art/uiFont';

const BASE = import.meta.env.BASE_URL;

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<string, Slot> = {
  family: { url: `${BASE}art/family-photo.png`, img: null, ready: false },
  wallpaper: { url: `${BASE}art/wallpaper-tile.png`, img: null, ready: false },
  monument: { url: `${BASE}art/park-monument.png`, img: null, ready: false },
  moose: { url: `${BASE}art/white-moose.png`, img: null, ready: false },
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

/** Idempotent preload for apartment enter / bootstrap. */
export function preloadApartmentPhotos(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const key of Object.keys(slots) as (keyof typeof slots)[]) {
    ensureSlot(key);
  }
}

function withSmooth(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
): void {
  const prevSmooth = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  draw();
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.imageSmoothingQuality = prevQuality;
}

/**
 * Mega Drive apartment wallpaper — repeating 8×8 diamond motif.
 * Photo damask retained in public/art for optional future use; MD pass uses tiles.
 */
export function drawTiledWallpaper(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  preloadApartmentPhotos();
  drawMdWallpaper(ctx, x, y, w, h, 'apt');
  // Integer seam every 32px
  for (let sx = Math.round(x) + 32; sx < x + w; sx += 32) {
    px(ctx, sx, y + 2, 1, h - 6, WALLPAPER_SEAM);
  }
}

const WALLPAPER_SEAM = 'rgba(60, 58, 88, 0.35)';

/** Small framed family portrait on the wall near the computer. */
export function drawWallFamilyFrame(ctx: CanvasRenderingContext2D): void {
  preloadApartmentPhotos();
  // Portrait near desk/CRT, clear of Aerials poster & window
  const x = 148;
  const y = 52;
  const w = 22;
  const h = 28;

  px(ctx, x + 2, y + 2, w, h, '#2a2018');
  px(ctx, x, y, w, h, APT_PAL.frameDark);
  px(ctx, x + 1, y + 1, w - 2, h - 2, APT_PAL.frame);
  px(ctx, x + 2, y + 2, w - 4, h - 4, APT_PAL.frameHi);
  px(ctx, x + 3, y + 3, w - 6, h - 6, '#1a1410');

  const ix = x + 4;
  const iy = y + 4;
  const iw = w - 8;
  const ih = h - 8;
  const slot = slots.family!;
  if (slot.ready && slot.img) {
    withSmooth(ctx, () => {
      ctx.drawImage(slot.img!, ix, iy, iw, ih);
    });
  } else {
    px(ctx, ix, iy, iw, ih, '#88b070');
  }
}

/** Full diary / dresser photo overlay — счастливая семья. */
export function drawFamilyPhotoFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  preloadApartmentPhotos();
  const slot = slots.family!;
  if (!slot.ready || !slot.img) return false;
  withSmooth(ctx, () => {
    // Cover-fit into frame
    const iw = slot.img!.naturalWidth || slot.img!.width;
    const ih = slot.img!.naturalHeight || slot.img!.height;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(slot.img!, dx, dy, dw, dh);
    ctx.restore();
  });
  return true;
}

export type WindowGlass = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Ambient parade through the night window: monument, moose, park caption.
 * Loops left→right; cutouts lifted for night readability.
 */
export function drawWindowParade(
  ctx: CanvasRenderingContext2D,
  glass: WindowGlass,
  time: number,
  depthCam: number,
): void {
  preloadApartmentPhotos();
  const { x, y, w, h } = glass;
  const ox = Math.round(depthCam * 0.35);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Soft ground strip under parade
  px(ctx, x, y + h - 14, w, 14, 'rgba(20, 28, 18, 0.55)');

  // Slow ambient loop — monument + moose + caption stay in glass together longer
  const period = 28;
  const track = w + 120;
  const scroll = ((time % period) / period) * track;

  type Item =
    | { kind: 'monument' | 'moose'; offset: number; dw: number; dh: number }
    | { kind: 'caption'; offset: number };

  const items: Item[] = [
    { kind: 'monument', offset: 8, dw: 38, dh: 44 },
    { kind: 'moose', offset: 58, dw: 48, dh: 38 },
    { kind: 'caption', offset: 18 },
    { kind: 'monument', offset: 130, dw: 38, dh: 44 },
    { kind: 'moose', offset: 180, dw: 48, dh: 38 },
    { kind: 'caption', offset: 140 },
  ];

  for (const item of items) {
    const baseX = x - 80 + ((item.offset - scroll + track * 2) % track);
    const pxPos = Math.round(baseX + ox * 0.15);
    const bob = Math.sin(time * 1.4 + item.offset * 0.05) * 1.5;

    if (item.kind === 'caption') {
      const cy = y + h - 18 + bob;
      // Readable night caption plate — user spelling
      const label = 'парк 30 летия октября';
      const tw = measureUiText(ctx, label, 5.5, 600);
      const plateW = Math.ceil(tw + 8);
      px(ctx, pxPos - 2, Math.round(cy) - 1, plateW, 10, 'rgba(8, 10, 16, 0.78)');
      drawUiTextCentered(
        ctx,
        label,
        pxPos - 2 + plateW / 2,
        Math.round(cy),
        '#f0e8d0',
        5.5,
        650,
      );
      continue;
    }

    const slot = item.kind === 'monument' ? slots.monument! : slots.moose!;
    const iy = Math.round(y + h - 16 - item.dh + bob);
    if (slot.ready && slot.img) {
      withSmooth(ctx, () => {
        ctx.save();
        if (item.kind === 'monument') {
          // Dark granite: lift + cool rim so it reads on night sky
          ctx.globalAlpha = 0.95;
          ctx.filter = 'brightness(1.45) contrast(1.15) saturate(0.85)';
        } else {
          // White moose already pops; slight cool night wash
          ctx.globalAlpha = 0.98;
          ctx.filter = 'brightness(1.05) saturate(0.9)';
        }
        ctx.drawImage(slot.img!, pxPos, iy, item.dw, item.dh);
        ctx.filter = 'none';
        ctx.restore();
      });
      // Soft contact shadow
      px(ctx, pxPos + 4, y + h - 12, item.dw - 8, 2, 'rgba(0,0,0,0.35)');
    }
  }

  ctx.restore();
}
