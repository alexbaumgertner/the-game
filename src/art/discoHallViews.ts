/**
 * High-detail disco hall / crowd view plates for Level 7 «Орбита».
 * Sources: public/art/disco-view-{hall,interview,dancer,stage}.jpg
 * Drawn as a slow far backdrop; gameplay keeps the checker floor.
 */

import { px } from '@/art/pixelDraw';
import { DISKO_PAL } from '@/art/segaPalette';

const BASE = import.meta.env.BASE_URL;

export type DiscoViewId = 'hall' | 'interview' | 'dancer' | 'stage';

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<DiscoViewId, Slot> = {
  hall: { url: `${BASE}art/disco-view-hall.jpg`, img: null, ready: false },
  interview: { url: `${BASE}art/disco-view-interview.jpg`, img: null, ready: false },
  dancer: { url: `${BASE}art/disco-view-dancer.jpg`, img: null, ready: false },
  stage: { url: `${BASE}art/disco-view-stage.jpg`, img: null, ready: false },
};

let loadStarted = false;

function ensure(id: DiscoViewId): void {
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
export function preloadDiscoHallViews(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const id of Object.keys(slots) as DiscoViewId[]) ensure(id);
}

export function discoHallViewsReady(): boolean {
  preloadDiscoHallViews();
  return (
    slots.hall.ready ||
    slots.interview.ready ||
    slots.dancer.ready ||
    slots.stage.ready
  );
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

type PlateBlend = { id: DiscoViewId; alpha: number };

/**
 * Progress across the club floor (cam-driven 0→1):
 * hall → interview/crowd → dancer → stage.
 */
function plateBlend(progress: number): PlateBlend[] {
  const p = Math.max(0, Math.min(1, progress));
  const segments: { id: DiscoViewId; a0: number; a1: number }[] = [
    { id: 'hall', a0: -0.05, a1: 0.32 },
    { id: 'interview', a0: 0.22, a1: 0.55 },
    { id: 'dancer', a0: 0.48, a1: 0.78 },
    { id: 'stage', a0: 0.7, a1: 1.05 },
  ];
  const fade = 0.08;
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
  if (out.length === 0) out.push({ id: 'hall', alpha: 1 });
  return out;
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
  const overscan = 1.12;
  const scale = Math.max((dw * overscan) / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const maxSx = Math.max(0, iw - sw);
  const sx = maxSx * Math.max(0, Math.min(1, pan01));
  let sy = (ih - sh) / 2 + biasY * ih;
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Caption for HUD chip when a plate dominates. */
export function discoViewCaption(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.28) return 'Зал · зелёный неон';
  if (p < 0.52) return 'Публика · эфир «Орбиты»';
  if (p < 0.74) return 'Танцпол · красный луч';
  return 'Сцена · ВЕЛИКИЙ НОВГОРОД';
}

/**
 * Far club backdrop: photo plates with short crossfades.
 * Drawn in a band above the dance floor so checkers/sprites stay readable.
 * `progress` 0→1 as the camera travels the floor.
 */
export function drawDiscoHallBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time = 0,
): void {
  preloadDiscoHallViews();

  const p = Math.max(0, Math.min(1, progress));
  const P = DISKO_PAL;
  // Match FLOOR_Y ≈ 192 on 224 — leave floor band for gameplay checkers
  const bandH = Math.min(height, Math.floor(height * 0.86));

  // Fallback procedural neon sky while plates load
  px(ctx, 0, 0, width, bandH, P.skyTop);
  px(ctx, 0, Math.floor(bandH * 0.4), width, bandH, P.skyMid);
  const neon = Math.sin(time * 6) > 0 ? P.neonPink : P.neonCyan;
  px(ctx, 24, 28, 70, 5, neon);
  px(ctx, 120, 40, 56, 4, P.neonViolet);
  px(ctx, 210, 26, 48, 5, P.neonYellow);

  if (!discoHallViewsReady()) return;

  const blends = plateBlend(p);
  const pan = (p * 0.55 + Math.sin(time * 0.35) * 0.01) % 1;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);

  withSmooth(ctx, () => {
    const readyBlends = blends.filter((b) => {
      const s = slots[b.id];
      return !!s && s.ready && !!s.img && b.alpha > 0.02;
    });
    if (readyBlends.length === 0) return;

    const maxA = readyBlends.reduce((m, b) => Math.max(m, b.alpha), 0) || 1;
    const ordered = [...readyBlends].sort((a, b) => b.alpha - a.alpha);

    for (let i = 0; i < ordered.length; i++) {
      const b = ordered[i]!;
      const slot = slots[b.id]!;
      const img = slot.img!;
      ctx.globalAlpha = i === 0 ? 1 : Math.min(1, b.alpha / maxA);
      // Bias upward — keep neon signs / truss, crop busy lower crowd a bit
      drawPlateCover(ctx, img, -4, 0, width + 8, bandH, pan, -0.06);
      ctx.globalAlpha = 1;
    }

    // Neon heat wash — keeps MD club palette over the plates
    const wash = ctx.createLinearGradient(0, 0, 0, bandH);
    wash.addColorStop(0, `rgba(40, 8, 48, ${0.16 + pulse * 0.05})`);
    wash.addColorStop(0.5, 'rgba(20, 8, 28, 0.1)');
    wash.addColorStop(1, 'rgba(8, 4, 16, 0.62)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, bandH);

    // Soft side vignette so sprites read on the floor
    const side = ctx.createLinearGradient(0, 0, width, 0);
    side.addColorStop(0, 'rgba(8, 4, 16, 0.28)');
    side.addColorStop(0.18, 'rgba(8, 4, 16, 0)');
    side.addColorStop(0.82, 'rgba(8, 4, 16, 0)');
    side.addColorStop(1, 'rgba(8, 4, 16, 0.28)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, width, bandH);
  });

}
