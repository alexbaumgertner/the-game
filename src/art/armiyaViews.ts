/**
 * High-detail army view plates for Level 9 «Армия, 2010».
 * Sources: public/art/army-view-{parade,slogan,yard,soldier,formation}.jpg
 * Drawn as a slow far backdrop; gameplay keeps the parade-square tiles.
 */

import { px } from '@/art/pixelDraw';
import { ARMY_PAL } from '@/art/segaPalette';

const BASE = import.meta.env.BASE_URL;

export type ArmiyaViewId =
  | 'parade'
  | 'formation'
  | 'slogan'
  | 'yard'
  | 'soldier';

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<ArmiyaViewId, Slot> = {
  parade: { url: `${BASE}art/army-view-parade.jpg`, img: null, ready: false },
  formation: {
    url: `${BASE}art/army-view-formation.jpg`,
    img: null,
    ready: false,
  },
  slogan: { url: `${BASE}art/army-view-slogan.jpg`, img: null, ready: false },
  yard: { url: `${BASE}art/army-view-yard.jpg`, img: null, ready: false },
  soldier: { url: `${BASE}art/army-view-soldier.jpg`, img: null, ready: false },
};

let loadStarted = false;

function ensure(id: ArmiyaViewId): void {
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
export function preloadArmiyaViews(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const id of Object.keys(slots) as ArmiyaViewId[]) ensure(id);
}

export function armiyaViewsReady(): boolean {
  preloadArmiyaViews();
  return (
    slots.parade.ready ||
    slots.formation.ready ||
    slots.slogan.ready ||
    slots.yard.ready ||
    slots.soldier.ready
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

type PlateBlend = { id: ArmiyaViewId; alpha: number };

/**
 * Round / phase progress 0→1:
 * parade → formation → slogan wall → yard/equipment → soldier motif.
 */
function plateBlend(progress: number): PlateBlend[] {
  const p = Math.max(0, Math.min(1, progress));
  const segments: { id: ArmiyaViewId; a0: number; a1: number }[] = [
    { id: 'parade', a0: -0.05, a1: 0.28 },
    { id: 'formation', a0: 0.18, a1: 0.48 },
    { id: 'slogan', a0: 0.38, a1: 0.68 },
    { id: 'yard', a0: 0.58, a1: 0.88 },
    { id: 'soldier', a0: 0.78, a1: 1.05 },
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
  if (out.length === 0) out.push({ id: 'parade', alpha: 1 });
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

/** Caption for HUD chip when a plate dominates. */
export function armiyaViewCaption(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.22) return 'Плац · красное знамя';
  if (p < 0.42) return 'Строй · воздух густой';
  if (p < 0.62) return 'Лозунг · славное служение';
  if (p < 0.82) return 'Двор · генератор ржавый';
  return 'Ряд. Зуич · шаг';
}

/**
 * Map army phase + round index → 0…1 plate progress.
 * Intro = parade; rounds fan across mid plates; night/done = soldier.
 */
export function armiyaViewProgress(
  phase: string,
  round: number,
  roundCount: number,
): number {
  if (phase === 'intro') return 0.05;
  if (phase === 'night' || phase === 'done') return 0.95;
  const r = Math.max(0, Math.min(roundCount - 1, round));
  // Spread rounds across parade→formation→slogan→yard
  return 0.12 + ((r + 0.5) / roundCount) * 0.7;
}

/**
 * Far army backdrop: photo plates with short crossfades.
 * Drawn in a band above the parade square so tiles/sprites stay readable.
 */
export function drawArmiyaBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time = 0,
): void {
  preloadArmiyaViews();

  const p = Math.max(0, Math.min(1, progress));
  const P = ARMY_PAL;
  // Leave lower parade-square band for gameplay tiles (~FLOOR_Y 188 on 224)
  const bandH = Math.min(height, Math.floor(height * 0.82));

  // Fallback procedural overcast while plates load
  px(ctx, 0, 0, width, bandH, P.skyTop);
  px(ctx, 0, Math.floor(bandH * 0.45), width, bandH, P.skyMid);
  px(ctx, 8, 40, 70, 90, P.wall);
  px(ctx, 20, 70, 20, 28, P.skyLow);

  if (!armiyaViewsReady()) return;

  const blends = plateBlend(p);
  const pan = (p * 0.4 + Math.sin(time * 0.22) * 0.01) % 1;

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
      // Bias up slightly — keep sky/flag/slogan, crop busy lower ground
      drawPlateCover(ctx, img, -4, 0, width + 8, bandH, pan, -0.05);
      ctx.globalAlpha = 1;
    }

    // Cold khaki wash → dark ground seam for sprites
    const wash = ctx.createLinearGradient(0, 0, 0, bandH);
    wash.addColorStop(0, 'rgba(40, 48, 56, 0.18)');
    wash.addColorStop(0.55, 'rgba(30, 36, 40, 0.1)');
    wash.addColorStop(0.82, 'rgba(20, 28, 32, 0.4)');
    wash.addColorStop(1, 'rgba(12, 16, 20, 0.78)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, bandH);

    const side = ctx.createLinearGradient(0, 0, width, 0);
    side.addColorStop(0, 'rgba(12, 16, 20, 0.28)');
    side.addColorStop(0.16, 'rgba(12, 16, 20, 0)');
    side.addColorStop(0.84, 'rgba(12, 16, 20, 0)');
    side.addColorStop(1, 'rgba(12, 16, 20, 0.28)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, width, bandH);
  });
}
