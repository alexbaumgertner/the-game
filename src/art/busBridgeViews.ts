/**
 * Photo-quality bus-window views across мост Александра Невского.
 * Reference street-view plates + railing cutouts with banded parallax depth.
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

/** Soft ease for plate crossfades. */
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
  const out: PlateBlend[] = [];

  const kremlinA = 1 - smoothstep((p - 0.18) / 0.22);
  if (kremlinA > 0.02) out.push({ id: 'kremlin', alpha: kremlinA });

  let shipA = 0;
  if (p < 0.22) shipA = smoothstep(p / 0.22) * 0.55;
  else if (p < 0.55) shipA = 0.55 + smoothstep((p - 0.22) / 0.33) * 0.45;
  else shipA = 1 - smoothstep((p - 0.55) / 0.2);
  if (shipA > 0.02) out.push({ id: 'kremlinShip', alpha: shipA });

  let towerA = 0;
  if (p > 0.4 && p < 0.55) towerA = smoothstep((p - 0.4) / 0.15);
  else if (p >= 0.55 && p < 0.78) towerA = 1;
  else if (p >= 0.78) towerA = 1 - smoothstep((p - 0.78) / 0.18);
  if (towerA > 0.02) out.push({ id: 'shipTower', alpha: towerA });

  const diezA = p > 0.68 ? smoothstep((p - 0.68) / 0.22) : 0;
  if (diezA > 0.02) out.push({ id: 'diez', alpha: diezA });

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
 * Draw a horizontal band of a photo with independent pan (parallax).
 * Band is defined in destination Y; source Y maps proportionally.
 */
function drawPlateBand(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  /** Source vertical start/end as 0–1 of image height. */
  srcY0: number,
  srcY1: number,
  /** Horizontal pan in source pixels (positive → image moves left). */
  srcPanX: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw < 1 || ih < 1 || dh < 1) return;

  const sy0 = Math.max(0, Math.min(ih - 1, srcY0 * ih));
  const sy1 = Math.max(sy0 + 1, Math.min(ih, srcY1 * ih));
  const sh = sy1 - sy0;
  const scale = dw / iw;
  let sx = ((srcPanX % iw) + iw) % iw;

  const drawSeg = (sxi: number, dxi: number, segW: number): void => {
    if (segW < 0.5) return;
    ctx.drawImage(img, sxi, sy0, segW, sh, dxi, dy, segW * scale, dh);
  };

  const first = Math.min(iw, iw - sx);
  drawSeg(sx, dx, first);
  if (first * scale < dw - 0.5) {
    drawSeg(0, dx + first * scale, iw);
  }
}

/**
 * Bus-window cinematic: photo plates + banded parallax depth.
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
  const cam = p * 360 + Math.sin(time * 0.65) * 4;
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
    const skyH = Math.floor(glassH * 0.44);
    const farY = glassY + Math.floor(glassH * 0.3);
    const farH = Math.floor(glassH * 0.32);
    const rivY = glassY + Math.floor(glassH * 0.52);
    const rivH = Math.floor(glassH * 0.3);

    // 1) Dedicated sky plate — slowest
    const sky = slots.sky;
    if (sky.ready && sky.img) {
      drawLayerTiled(ctx, sky.img, glassY - 4, skyH, width, cam * 0.05 + time * 2.2);
    }

    // 2–4) Banded parallax from each active photo plate
    for (const b of blends) {
      const slot = slots[b.id];
      if (!slot.ready || !slot.img) continue;
      const img = slot.img;
      const iw = img.naturalWidth || img.width;
      const panUnit = iw / Math.max(1, glassW);
      ctx.globalAlpha = Math.min(1, b.alpha);

      // Sky band from plate (very slow)
      drawPlateBand(ctx, img, glassX - 10, glassY, glassW + 20, skyH, 0, 0.42, cam * 0.08 * panUnit);

      // Landmarks (Kremlin / Sophia / tower / Diez) — slow
      drawPlateBand(ctx, img, glassX - 10, farY, glassW + 20, farH, 0.28, 0.58, cam * 0.2 * panUnit);

      // River / banks — medium
      drawPlateBand(ctx, img, glassX - 10, rivY, glassW + 20, rivH, 0.5, 0.78, cam * 0.48 * panUnit);

      // Lower plate (railing base in photo) — faster, under cutout
      const nearY = glassY + Math.floor(glassH * 0.68);
      const nearH = glassY + glassH - nearY;
      drawPlateBand(ctx, img, glassX - 10, nearY, glassW + 20, nearH, 0.68, 1, cam * 0.85 * panUnit);

      ctx.globalAlpha = 1;
    }

    // Soft vignette
    const g = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
    g.addColorStop(0, 'rgba(20, 28, 40, 0.14)');
    g.addColorStop(0.5, 'rgba(20, 28, 40, 0)');
    g.addColorStop(1, 'rgba(12, 16, 22, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // 5) Railing cutout — fastest near field
    const railH = Math.floor(glassH * 0.42);
    const railY = glassY + glassH - railH + 2;
    const railScroll = cam * 1.25 + time * 7;
    const railPrimary = slots[p < 0.5 ? 'railingKremlin' : 'railingShipTower'];
    const railSecondary = slots[p < 0.5 ? 'railingShipTower' : 'railingKremlin'];
    if (railPrimary.ready && railPrimary.img) {
      ctx.globalAlpha = p < 0.55 ? 1 : 1 - smoothstep((p - 0.5) / 0.12) * 0.4;
      drawLayerTiled(ctx, railPrimary.img, railY, railH, width, railScroll);
      ctx.globalAlpha = 1;
    }
    if (p > 0.46 && railSecondary.ready && railSecondary.img) {
      ctx.globalAlpha = smoothstep((p - 0.46) / 0.16);
      drawLayerTiled(ctx, railSecondary.img, railY, railH, width, railScroll + 52);
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
