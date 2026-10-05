/**
 * Photo-quality lookout plates for Level 6 «Мост / Волхов».
 * Three views from Alexander Nevsky Bridge (1995-adapted, no modern UI):
 *   kremlin — Detinets wall + Kremlevsky beach
 *   volkhov — downriver toward Victory monument / Yaroslav Court
 *   dvorishche — white arcade + docked boat
 * Sources: public/art/most-view-*.jpg
 */

import { px } from '@/art/pixelDraw';

const BASE = import.meta.env.BASE_URL;

export type MostViewId = 'kremlin' | 'volkhov' | 'dvorishche';

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<MostViewId, Slot> = {
  kremlin: { url: `${BASE}art/most-view-kremlin.jpg`, img: null, ready: false },
  volkhov: { url: `${BASE}art/most-view-volkhov.jpg`, img: null, ready: false },
  dvorishche: {
    url: `${BASE}art/most-view-dvorishche.jpg`,
    img: null,
    ready: false,
  },
};

let loadStarted = false;

function ensure(id: MostViewId): void {
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

/** Idempotent preload — call from bootstrap / Most enter. */
export function preloadMostBridgeViews(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const id of Object.keys(slots) as MostViewId[]) ensure(id);
}

export function mostBridgeViewsReady(): boolean {
  preloadMostBridgeViews();
  return slots.kremlin.ready || slots.volkhov.ready || slots.dvorishche.ready;
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

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

type PlateBlend = { id: MostViewId; alpha: number };

/**
 * Walk across the bridge (0→1 cam progress):
 * kremlin (Detinets/beach) → volkhov downriver → dvorishche arcade.
 */
function plateBlend(progress: number): PlateBlend[] {
  const p = Math.max(0, Math.min(1, progress));
  const segments: { id: MostViewId; a0: number; a1: number }[] = [
    { id: 'kremlin', a0: -0.05, a1: 0.38 },
    { id: 'volkhov', a0: 0.28, a1: 0.72 },
    { id: 'dvorishche', a0: 0.62, a1: 1.05 },
  ];
  const fade = 0.1;
  const out: PlateBlend[] = [];
  for (const seg of segments) {
    let a = 0;
    if (p >= seg.a0 && p <= seg.a1) {
      const inF = smoothstep((p - seg.a0) / fade);
      const outF = 1 - smoothstep((p - (seg.a1 - fade)) / fade);
      a = Math.min(inF, outF);
    }
    if (a > 0.02) out.push({ id: seg.id, alpha: a });
  }
  if (out.length === 0) out.push({ id: 'kremlin', alpha: 1 });
  return out;
}

/**
 * Cover-fit a plate into a band, cropping out the baked railing (~bottom 28%)
 * so procedural deck/rails sit in front.
 */
function drawPlateFarBand(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  pan01: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw < 1 || ih < 1 || dw < 1 || dh < 1) return;

  // Exclude lower railing / walkway baked into the drawing
  const srcH = ih * 0.72;
  const srcY = ih * 0.02;
  const overscan = 1.12;
  const scale = Math.max((dw * overscan) / iw, dh / srcH);
  const sw = dw / scale;
  const sh = dh / scale;
  const maxSx = Math.max(0, iw - sw);
  const sx = maxSx * Math.max(0, Math.min(1, pan01));
  let sy = srcY + Math.max(0, (srcH - sh) * 0.35);
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Far parallax backdrop for Most gameplay — plates crossfade with cam progress.
 * `progress` 0→1 across world camera range.
 */
export function drawMostBridgeFar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time = 0,
): void {
  preloadMostBridgeViews();

  const p = Math.max(0, Math.min(1, progress));
  const bandH = Math.min(height, Math.floor(height * 0.78));
  const blends = plateBlend(p);

  // Cool night underlay while plates load / as color key
  px(ctx, 0, 0, width, bandH, '#0c1828');
  px(ctx, 0, Math.floor(bandH * 0.55), width, bandH, '#1a3048');

  withSmooth(ctx, () => {
    const readyBlends = blends.filter((b) => {
      const s = slots[b.id];
      return !!s && s.ready && !!s.img && b.alpha > 0.02;
    });
    if (readyBlends.length === 0) return;

    const maxA = readyBlends.reduce((m, b) => Math.max(m, b.alpha), 0) || 1;
    const ordered = [...readyBlends].sort((a, b) => b.alpha - a.alpha);
    const bob = Math.sin(time * 0.35) * 0.004;

    for (let i = 0; i < ordered.length; i++) {
      const b = ordered[i]!;
      const slot = slots[b.id]!;
      const img = slot.img!;
      const a = i === 0 ? 1 : Math.min(1, b.alpha / maxA);
      ctx.globalAlpha = a;
      const pan = (p * 0.55 + bob + (i === 0 ? 0 : 0.08)) % 1;
      drawPlateFarBand(ctx, img, -2, 0, width + 4, bandH, pan);
      ctx.globalAlpha = 1;
    }

    // Winter-night wash so plates sit under lamps / snow
    const g = ctx.createLinearGradient(0, 0, 0, bandH);
    g.addColorStop(0, 'rgba(8, 16, 28, 0.42)');
    g.addColorStop(0.45, 'rgba(12, 22, 36, 0.28)');
    g.addColorStop(1, 'rgba(16, 28, 40, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, bandH);
  });
}

/** Caption for HUD / toast when a plate dominates. */
export function mostViewCaption(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.35) return 'Вид: Кремль · пляж';
  if (p < 0.68) return 'Волхов · вниз по реке';
  return 'Ярославово Дворище';
}
