/**
 * Photo-quality «Вокзал для двоих» wall posters for Vokzal1995.
 * Faces: public/art/vokzal-poster-{gurchenko,snow,official}.jpg
 */

import { px } from '@/art/pixelDraw';
import { VOKZAL_PAL } from '@/art/segaPalette';

export type VokzalPosterKind = 'gurchenko' | 'snow' | 'official';

interface PosterSlot {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
}

const BASE = import.meta.env.BASE_URL;

const posters: Record<VokzalPosterKind, PosterSlot> = {
  gurchenko: {
    url: `${BASE}art/vokzal-poster-gurchenko.jpg`,
    img: null,
    ready: false,
  },
  snow: {
    url: `${BASE}art/vokzal-poster-snow.jpg`,
    img: null,
    ready: false,
  },
  official: {
    url: `${BASE}art/vokzal-poster-official.jpg`,
    img: null,
    ready: false,
  },
};

let loadStarted = false;

/** Kick off async load (idempotent). */
export function preloadVokzalPosters(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const key of Object.keys(posters) as VokzalPosterKind[]) {
    const slot = posters[key];
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
 * Framed photo poster. Large station-wall sizes; high-quality smoothing for the
 * photo face, then restore prior smoothing mode for pixel art.
 */
export function drawVokzalFilmPoster(
  ctx: CanvasRenderingContext2D,
  kind: VokzalPosterKind,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  preloadVokzalPosters();

  const ox = Math.round(x);
  const oy = Math.round(y);
  const ow = Math.round(w);
  const oh = Math.round(h);

  // Drop shadow + dark wood frame + warm mat
  px(ctx, ox + 2, oy + 2, ow, oh, '#1a1418');
  px(ctx, ox, oy, ow, oh, '#2a2018');
  px(ctx, ox + 1, oy + 1, ow - 2, oh - 2, '#0c0c12');
  px(ctx, ox + 2, oy + 2, ow - 4, oh - 4, '#c8b090');
  px(ctx, ox + 2, oy + 2, ow - 4, 1, '#e0d0b0');
  px(ctx, ox + 2, oy + 2, 1, oh - 4, '#d8c8a8');
  px(ctx, ox + ow - 3, oy + 2, 1, oh - 4, '#8a7858');
  px(ctx, ox + 2, oy + oh - 3, ow - 4, 1, '#786848');

  const ix = ox + 3;
  const iy = oy + 3;
  const iw = ow - 6;
  const ih = oh - 6;
  const slot = posters[kind];

  if (slot.ready && slot.img) {
    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevQuality = ctx.imageSmoothingQuality;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(slot.img, ix, iy, iw, ih);
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.imageSmoothingQuality = prevQuality;
  } else {
    px(ctx, ix, iy, iw, ih, '#141018');
  }

  // Slight edge wear / tape so posters read as hung paper
  px(ctx, ox + 2, oy + 2, 4, 2, '#d0c090');
  px(ctx, ox + ow - 6, oy + 2, 4, 2, '#d0c090');
  px(ctx, ox + 2, oy + oh - 4, 4, 2, VOKZAL_PAL.hallHi);
}
