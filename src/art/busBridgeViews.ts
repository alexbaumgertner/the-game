/**
 * Photo-quality bus-window views across мост Александра Невского.
 * Reference street-view plates + railing cutouts with parallax depth.
 * Sources: public/art/bus-bridge-*.jpg|.png
 */

import { px } from '@/art/pixelDraw';
import { drawUiTextCentered } from '@/art/uiFont';

const BASE = import.meta.env.BASE_URL;

export type BusBridgePlateId =
  | 'sky'
  | 'kremlin'
  | 'kremlinShip'
  | 'shipTower'
  | 'diez'
  | 'railingKremlin'
  | 'railingShipTower';

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slots: Record<BusBridgePlateId, Slot> = {
  sky: { url: `${BASE}art/bus-bridge-sky.jpg`, img: null, ready: false },
  kremlin: { url: `${BASE}art/bus-bridge-kremlin.jpg`, img: null, ready: false },
  kremlinShip: { url: `${BASE}art/bus-bridge-kremlin-ship.jpg`, img: null, ready: false },
  shipTower: { url: `${BASE}art/bus-bridge-ship-tower.jpg`, img: null, ready: false },
  diez: { url: `${BASE}art/bus-bridge-diez.jpg`, img: null, ready: false },
  railingKremlin: { url: `${BASE}art/bus-bridge-railing-kremlin.png`, img: null, ready: false },
  railingShipTower: { url: `${BASE}art/bus-bridge-railing-ship-tower.png`, img: null, ready: false },
};

let loadStarted = false;

function ensure(id: BusBridgePlateId): void {
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

/** Idempotent preload — call from bootstrap / rynok enter. */
export function preloadBusBridgeViews(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const id of Object.keys(slots) as BusBridgePlateId[]) ensure(id);
}

export function busBridgeViewsReady(): boolean {
  preloadBusBridgeViews();
  return (
    slots.kremlin.ready ||
    slots.kremlinShip.ready ||
    slots.shipTower.ready ||
    slots.diez.ready
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

type PlateBlend = { id: BusBridgePlateId; alpha: number };

/**
 * Sequence across the bridge:
 * 0.00–0.32 kremlin / Sophia
 * 0.22–0.55 kremlin + ship
 * 0.45–0.82 ship / TV tower / «ВЕЛИКИЙ…»
 * 0.70–1.00 Diez / Универмаг / tower
 */
function plateBlend(progress: number): PlateBlend[] {
  const p = Math.max(0, Math.min(1, progress));
  // Short crossfades — one dominant plate avoids ghosted banks / pedestrians.
  // 0.00–0.30 kremlin → 0.28–0.52 kremlinShip → 0.50–0.76 shipTower → 0.74–1.00 diez
  const segments: { id: BusBridgePlateId; a0: number; a1: number }[] = [
    { id: 'kremlin', a0: -0.05, a1: 0.3 },
    { id: 'kremlinShip', a0: 0.28, a1: 0.52 },
    { id: 'shipTower', a0: 0.5, a1: 0.76 },
    { id: 'diez', a0: 0.74, a1: 1.05 },
  ];
  const fade = 0.06;
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

function drawLayerTiled(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  y: number,
  h: number,
  viewW: number,
  scroll: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw < 1 || ih < 1 || h < 1) return;
  const scale = h / ih;
  const dw = Math.max(1, iw * scale);
  const offset = -((scroll % dw) + dw) % dw;
  for (let x = offset - dw; x < viewW + dw; x += dw) {
    ctx.drawImage(img, 0, 0, iw, ih, Math.round(x), y, dw, h);
  }
}

/**
 * Cover-fit a plate into the glass with horizontal pan + slight vertical bias.
 * Draws slightly wider than glass so pan doesn't reveal edges.
 */
function drawPlateCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  /** 0..1 pan across spare horizontal source (0.5 = centered). */
  pan01: number,
  /** Vertical bias: negative = more sky, positive = more railing. */
  biasY = 0.04,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw < 1 || ih < 1) return;

  // Overscan so slow/fast parallax layers can shift without empty edges
  const overscan = 1.18;
  const scale = Math.max((dw * overscan) / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const maxSx = Math.max(0, iw - sw);
  const sx = maxSx * Math.max(0, Math.min(1, pan01));
  let sy = (ih - sh) / 2 + biasY * ih;
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Bus-window cinematic: photo plates + parallax depth.
 * `progress` 0→1 over the bridge crossing.
 */
export function drawBusBridgeParallax(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time = 0,
): void {
  preloadBusBridgeViews();

  const p = Math.max(0, Math.min(1, progress));
  const cam = p * 1.0;
  const bob = Math.sin(time * 0.7) * 0.008;
  const glassX = 12;
  const glassY = 10;
  const glassW = width - 24;
  const glassH = height - 46;
  const blends = plateBlend(p);

  // Fallback while images load
  px(ctx, 0, 0, width, height, '#3a6aa0');
  px(ctx, 0, Math.floor(height * 0.55), width, height, '#5a7888');

  ctx.save();
  ctx.beginPath();
  ctx.rect(glassX, glassY, glassW, glassH);
  ctx.clip();

  withSmooth(ctx, () => {
    // Normalize blend weights so the strongest plate is opaque (no wash-through).
    const readyBlends = blends.filter((b) => {
      const s = slots[b.id];
      return !!s && s.ready && !!s.img && b.alpha > 0.02;
    });
    const maxA = readyBlends.reduce((m, b) => Math.max(m, b.alpha), 0) || 1;

    // 1) Sky — slowest drift (only as underlay behind plates)
    const sky = slots.sky;
    if (sky.ready && sky.img) {
      const skyPan = (cam * 0.08 + time * 0.006 + bob * 0.35) % 1;
      drawPlateCover(
        ctx,
        sky.img,
        glassX - 4,
        glassY - 2,
        glassW + 8,
        glassH,
        skyPan,
        -0.05,
      );
    }

    // 2) Photo plates — opaque base + short crossfade only
    const ordered = [...readyBlends].sort((a, b) => b.alpha - a.alpha);
    for (let i = 0; i < ordered.length; i++) {
      const b = ordered[i]!;
      const slot = slots[b.id]!;
      const img = slot.img!;
      const a = i === 0 ? 1 : Math.min(1, b.alpha / maxA);
      ctx.globalAlpha = a;
      const midPan = (cam * 0.4 + bob) % 1;
      drawPlateCover(ctx, img, glassX - 2, glassY, glassW + 4, glassH, midPan, 0.06);
      ctx.globalAlpha = 1;
    }

    // Soft vignette
    const g = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
    g.addColorStop(0, 'rgba(20, 28, 40, 0.08)');
    g.addColorStop(0.55, 'rgba(20, 28, 40, 0)');
    g.addColorStop(1, 'rgba(12, 16, 22, 0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // 3) Railing cutout — fastest near field (parallax depth cue)
    const railH = Math.floor(glassH * 0.28);
    const railY = glassY + glassH - railH + 1;
    const railScroll = cam * 560 + time * 16;
    const railPrimary = slots[p < 0.5 ? 'railingKremlin' : 'railingShipTower'];
    const railSecondary = slots[p < 0.5 ? 'railingShipTower' : 'railingKremlin'];
    if (railPrimary.ready && railPrimary.img) {
      ctx.globalAlpha = 1;
      drawLayerTiled(ctx, railPrimary.img, railY, railH, width, railScroll);
    }
    if (p > 0.48 && railSecondary.ready && railSecondary.img) {
      ctx.globalAlpha = smoothstep((p - 0.48) / 0.14);
      drawLayerTiled(ctx, railSecondary.img, railY, railH, width, railScroll + 80);
      ctx.globalAlpha = 1;
    }
  });

  // Glass reflection
  ctx.fillStyle = 'rgba(220, 235, 255, 0.06)';
  ctx.fillRect(glassX + 8, glassY + 6, 3, glassH - 14);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(glassX + Math.floor(glassW * 0.55), glassY + 4, 2, glassH - 10);

  ctx.restore();

  // Bus interior frame
  px(ctx, 0, 0, 12, height, '#2a2420');
  px(ctx, width - 12, 0, 12, height, '#2a2420');
  px(ctx, 0, 0, width, 10, '#3a3428');
  px(ctx, 0, 8, width, 2, '#1a1814');
  px(ctx, 10, 8, width - 20, 2, '#1a2030');
  px(ctx, 10, 8, 2, height - 44, '#1a2030');
  px(ctx, width - 12, 8, 2, height - 44, '#1a2030');
  px(ctx, 0, height - 36, width, 36, '#3a3830');
  px(ctx, 0, height - 36, width, 3, '#2a2820');
  px(ctx, 8, height - 34, width - 16, 2, '#4a4840');

  const caption =
    p < 0.42
      ? 'Вид: Кремль и Софийский собор'
      : p < 0.72
        ? 'Волхов · фрегат · телебашня'
        : 'Диез / Универмаг · левый берег';
  drawUiTextCentered(
    ctx,
    'Автобус №7 · мост А. Невского',
    width / 2,
    height - 28,
    '#e8d8a0',
    7,
    600,
  );
  drawUiTextCentered(ctx, caption, width / 2, height - 16, '#a0b8d0', 6.5, 500);
}
