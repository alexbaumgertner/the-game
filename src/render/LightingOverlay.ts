/**
 * Mega Drive–style lighting — stepped brightness + checker dither.
 *
 * Pipeline (after gameplay, before HUD):
 *   1. Ambient multiply wash (cold winter night)
 *   2. Point / fire lights as 3–4 ring levels with dithered edges
 *   3. Headlight cones as stepped bands
 *
 * All work is in logical 320×224; display scale is the canvas transform only.
 */

import { getSettings } from '@/core/Settings';

export type LightKind = 'ambient' | 'fire' | 'headlight';

export interface PointLight {
  kind: 'fire' | 'point';
  x: number;
  y: number;
  radius: number;
  color: string;
  phase?: number;
  screenSpace?: boolean;
}

export interface ConeLight {
  kind: 'headlight';
  x: number;
  y: number;
  facing: 1 | -1;
  length: number;
  spread: number;
  color: string;
  screenSpace?: boolean;
}

export interface AmbientConfig {
  color: string;
}

export interface LightingFrame {
  ambient: AmbientConfig;
  points: readonly PointLight[];
  cones: readonly ConeLight[];
  time: number;
}

let lightBuf: HTMLCanvasElement | null = null;
let lightCtx: CanvasRenderingContext2D | null = null;

function ensureBuffer(w: number, h: number): CanvasRenderingContext2D {
  if (!lightBuf || lightBuf.width !== w || lightBuf.height !== h) {
    lightBuf = document.createElement('canvas');
    lightBuf.width = w;
    lightBuf.height = h;
    lightCtx = lightBuf.getContext('2d');
    if (!lightCtx) throw new Error('Lighting buffer unavailable');
  }
  return lightCtx!;
}

function withAlpha(hexOrRgba: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (hexOrRgba.startsWith('rgba')) {
    return hexOrRgba.replace(/rgba\(([^)]+)\)/, (_m, inner) => {
      const parts = String(inner).split(',').map((s) => s.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a.toFixed(3)})`;
    });
  }
  if (hexOrRgba.startsWith('#')) {
    const h = hexOrRgba.slice(1);
    const full =
      h.length === 3
        ? h
            .split('')
            .map((c) => c + c)
            .join('')
        : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }
  return hexOrRgba;
}

/**
 * Stepped radial mask: 4 brightness levels + checker dither on ring edges.
 * No soft Canvas arcs / gradients. Scanline fills for speed.
 */
function drawSteppedDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  strength = 1,
): void {
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const rMax = Math.max(1, Math.round(radius));
  // Outer → inner (overpaint): 4 discrete brightness steps
  const levels: ReadonlyArray<{ t: number; a: number }> = [
    { t: 1.0, a: 0.14 * strength },
    { t: 0.7, a: 0.32 * strength },
    { t: 0.42, a: 0.55 * strength },
    { t: 0.2, a: 0.8 * strength },
  ];

  for (let li = 0; li < levels.length; li++) {
    const { t, a } = levels[li]!;
    const r = Math.max(1, Math.round(rMax * t));
    ctx.fillStyle = withAlpha(color, a);
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(ix - half, iy + dy, half * 2 + 1, 1);
    }
    // Checker dither on the outermost ring only
    if (li === 0 && r > 2) {
      const rIn = r - 2;
      for (let dy = -r; dy <= r; dy++) {
        const halfOut = Math.floor(Math.sqrt(r * r - dy * dy));
        const halfIn =
          Math.abs(dy) <= rIn ? Math.floor(Math.sqrt(rIn * rIn - dy * dy)) : -1;
        for (let dx = -halfOut; dx <= halfOut; dx++) {
          if (Math.abs(dx) <= halfIn) continue;
          if (((ix + dx) ^ (iy + dy)) & 1) {
            ctx.clearRect(ix + dx, iy + dy, 1, 1);
          }
        }
      }
    }
  }
}

function drawHeadlightCone(
  ctx: CanvasRenderingContext2D,
  cone: ConeLight,
  ox: number,
): void {
  const x0 = Math.round(cone.x - ox);
  const y0 = Math.round(cone.y);
  const len = cone.length;
  const spread = cone.spread;
  const dir = cone.facing;

  // 4 stepped bands (no soft tip arc)
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const xA = x0 + Math.round(dir * len * t0);
    const xB = x0 + Math.round(dir * len * t1);
    const halfA = Math.round(spread * t0 * 0.35 + 1);
    const halfB = Math.round(spread * t1);
    const a = 0.16 * (1 - t0);
    ctx.fillStyle = withAlpha(cone.color, a);
    const left = Math.min(xA, xB);
    const right = Math.max(xA, xB);
    const top = y0 - Math.max(halfA, halfB);
    const bot = y0 + Math.max(halfA, halfB);
    const bw = Math.max(1, right - left);
    const bh = bot - top;
    // Solid core + checker on vertical edges
    ctx.fillRect(left, top, bw, bh);
    ctx.fillStyle = withAlpha(cone.color, a * 0.45);
    for (let ey = top; ey < bot; ey++) {
      if (((left + ey) & 1) === 0) ctx.fillRect(left, ey, 1, 1);
      if (((right - 1 + ey) & 1) === 0) ctx.fillRect(right - 1, ey, 1, 1);
    }
  }

  ctx.fillStyle = withAlpha('#ffffe8', 0.35);
  ctx.fillRect(x0 + (dir > 0 ? 0 : -2), y0 - 1, 3, 3);
}

/**
 * Composite stepped lighting onto the main canvas in logical coordinates.
 */
export function applyLightingOverlay(
  ctx: CanvasRenderingContext2D,
  camX: number,
  viewW: number,
  viewH: number,
  frame: LightingFrame,
): void {
  const bufW = Math.max(1, Math.round(viewW));
  const bufH = Math.max(1, Math.round(viewH));
  const buf = ensureBuffer(bufW, bufH);
  buf.setTransform(1, 0, 0, 1, 0, 0);
  buf.imageSmoothingEnabled = false;
  buf.clearRect(0, 0, bufW, bufH);

  const ox = Math.round(camX);

  for (const p of frame.points) {
    // Quantize flicker to a few discrete strengths (MD feel)
    const reduceFx = getSettings().reducedEffects;
    const rawFlicker =
      p.kind === 'fire' && !reduceFx
        ? 0.82 +
          0.18 *
            Math.sin(frame.time * 9 + (p.phase ?? 0)) *
            Math.sin(frame.time * 13.7 + (p.phase ?? 1))
        : 1;
    const flicker =
      p.kind === 'fire' && !reduceFx
        ? rawFlicker > 0.92
          ? 1
          : rawFlicker > 0.86
            ? 0.9
            : 0.8
        : 1;
    const sx = p.screenSpace ? p.x : p.x - ox;
    const sy = p.y;
    const r = p.radius * (p.kind === 'fire' ? flicker : 1);
    drawSteppedDisc(buf, sx, sy, r, p.color, p.kind === 'fire' ? 1.0 : 0.85);
    if (p.kind === 'fire') {
      drawSteppedDisc(buf, sx, sy - 2, r * 0.45, '#ffe8a0', 0.7 * flicker);
    }
  }

  for (const c of frame.cones) {
    const localOx = c.screenSpace ? 0 : ox;
    drawHeadlightCone(buf, c, localOx);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = frame.ambient.color;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(lightBuf!, 0, 0, bufW, bufH, 0, 0, viewW, viewH);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
}

export function makeTrashFire(x: number, y: number, phase = 0): PointLight {
  return {
    kind: 'fire',
    x,
    y,
    radius: 38,
    color: '#ff6a18',
    phase,
  };
}

export function makeHeadlight(
  x: number,
  y: number,
  facing: 1 | -1,
  length = 80,
  spread = 12,
): ConeLight {
  return {
    kind: 'headlight',
    x,
    y,
    facing,
    length,
    spread,
    color: '#f0f4ff',
  };
}
