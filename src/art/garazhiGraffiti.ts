/**
 * Photo-quality «Гараж» wheatpasted posters / graffiti for Garazhi1995.
 * Faces: public/art/garazhi-graffiti-*.jpg
 */

import { px } from '@/art/pixelDraw';

export type GarazhiGraffitiKind =
  | 'gaftAkhedzhakova'
  | 'ryazanovHippo'
  | 'couple'
  | 'brondukov'
  | 'nemolyaeva'
  | 'gaftMonkey'
  | 'akhedzhakovaScarf';

interface PlateSlot {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
}

const BASE = import.meta.env.BASE_URL;

const plates: Record<GarazhiGraffitiKind, PlateSlot> = {
  gaftAkhedzhakova: {
    url: `${BASE}art/garazhi-graffiti-gaft-akhedzhakova.jpg`,
    img: null,
    ready: false,
  },
  ryazanovHippo: {
    url: `${BASE}art/garazhi-graffiti-ryazanov-hippo.jpg`,
    img: null,
    ready: false,
  },
  couple: {
    url: `${BASE}art/garazhi-graffiti-couple.jpg`,
    img: null,
    ready: false,
  },
  brondukov: {
    url: `${BASE}art/garazhi-graffiti-brondukov.jpg`,
    img: null,
    ready: false,
  },
  nemolyaeva: {
    url: `${BASE}art/garazhi-graffiti-nemolyaeva.jpg`,
    img: null,
    ready: false,
  },
  gaftMonkey: {
    url: `${BASE}art/garazhi-graffiti-gaft-monkey.jpg`,
    img: null,
    ready: false,
  },
  akhedzhakovaScarf: {
    url: `${BASE}art/garazhi-graffiti-akhedzhakova-scarf.jpg`,
    img: null,
    ready: false,
  },
};

let loadStarted = false;

/** Kick off async load (idempotent). */
export function preloadGarazhiGraffiti(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const key of Object.keys(plates) as GarazhiGraffitiKind[]) {
    const slot = plates[key];
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
}

/**
 * Wheatpasted film still on a garage door / metal wall.
 * High-quality smoothing for the photo face; restores prior pixel mode after.
 */
export function drawGarazhiGraffiti(
  ctx: CanvasRenderingContext2D,
  kind: GarazhiGraffitiKind,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  preloadGarazhiGraffiti();

  const ox = Math.round(x);
  const oy = Math.round(y);
  const ow = Math.round(w);
  const oh = Math.round(h);
  if (ow < 8 || oh < 8) return;

  // Soft contact shadow on corrugated metal
  px(ctx, ox + 1, oy + 1, ow, oh, 'rgba(8, 6, 10, 0.45)');

  // Torn paper / paste rim (slightly irregular via inset strips)
  px(ctx, ox, oy, ow, oh, '#c8b898');
  px(ctx, ox + 1, oy + 1, ow - 2, oh - 2, '#1a1418');

  const ix = ox + 2;
  const iy = oy + 2;
  const iw = ow - 4;
  const ih = oh - 4;
  const slot = plates[kind];

  if (slot.ready && slot.img) {
    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevQuality = ctx.imageSmoothingQuality;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(slot.img, ix, iy, iw, ih);
    // Night yard wash so plates sit in winter dusk
    ctx.fillStyle = 'rgba(18, 16, 28, 0.18)';
    ctx.fillRect(ix, iy, iw, ih);
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.imageSmoothingQuality = prevQuality;
  } else {
    px(ctx, ix, iy, iw, ih, '#141018');
  }

  // Masking tape / paste blobs at corners — reads as street wheatpaste
  px(ctx, ox + 1, oy + 1, 5, 2, '#d8c890');
  px(ctx, ox + ow - 6, oy + 1, 5, 2, '#d0c088');
  px(ctx, ox + 1, oy + oh - 3, 4, 2, '#b8a878');
  px(ctx, ox + ow - 5, oy + oh - 3, 4, 2, '#c0b080');
  // Edge nick / peel
  px(ctx, ox + Math.floor(ow * 0.35), oy, 3, 1, '#8a7860');
  px(ctx, ox + ow - 2, oy + Math.floor(oh * 0.55), 1, 3, '#6a5850');
}
