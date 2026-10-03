/**
 * Neo-Noir dynamic lighting — Canvas blend modes over the pixel buffer.
 *
 * Pipeline (after gameplay, before HUD):
 *   1. Ambient multiply wash (cold winter night — higher floor / lower alpha for readable midtones)
 *   2. Trash-fire orange glows via `screen` / `lighter`
 *   3. Moving car headlight cones via `screen`
 *
 * Lights are specified in world space; the overlay converts with camX.
 * Always restore globalCompositeOperation to `source-over` and keep
 * imageSmoothingEnabled = false for crisp edges.
 */

export type LightKind = 'ambient' | 'fire' | 'headlight';

export interface PointLight {
  kind: 'fire' | 'point';
  /** World X (or screen X if screenSpace). */
  x: number;
  y: number;
  /** Soft radius in pixels. */
  radius: number;
  /** Core color (orange for fire, white for lamp). */
  color: string;
  /** Optional flicker phase offset. */
  phase?: number;
  screenSpace?: boolean;
}

export interface ConeLight {
  kind: 'headlight';
  /** World origin (headlamp). */
  x: number;
  y: number;
  /** Facing: 1 = right, -1 = left. */
  facing: 1 | -1;
  /** Cone length along facing. */
  length: number;
  /** Half-width at the tip. */
  spread: number;
  color: string;
  screenSpace?: boolean;
}

export interface AmbientConfig {
  /** Multiply fill — dark winter. Use rgba for strength. */
  color: string;
}

export interface LightingFrame {
  ambient: AmbientConfig;
  points: readonly PointLight[];
  cones: readonly ConeLight[];
  /** Seconds — drives fire flicker. */
  time: number;
}

/** Offscreen buffer reused across frames (lazy-allocated). */
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

/** Soft radial bloom — more midtone rings + circular falloff (hi-bit). */
function drawSoftDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  strength = 1,
): void {
  const steps = Math.max(10, Math.min(28, Math.floor(radius / 1.4)));
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const r = radius * t;
    const a = strength * Math.pow(1 - t, 1.85) * 0.85;
    ctx.fillStyle = withAlpha(color, a);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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

  // Layered trapezoids approximating a cone (screen blend later).
  // Second dim pass: faintly visible beams, well below trash-fire blooms.
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const xA = x0 + Math.round(dir * len * t0);
    const xB = x0 + Math.round(dir * len * t1);
    const halfA = Math.round(spread * t0 * 0.35 + 1);
    const halfB = Math.round(spread * t1);
    const a = 0.12 * (1 - t0);
    ctx.fillStyle = withAlpha(cone.color, a);
    const left = Math.min(xA, xB);
    const right = Math.max(xA, xB);
    const top = y0 - Math.max(halfA, halfB);
    const bot = y0 + Math.max(halfA, halfB);
    ctx.fillRect(left, top, Math.max(1, right - left), bot - top);
    // Taper edges
    ctx.fillStyle = withAlpha(cone.color, a * 0.4);
    ctx.fillRect(left, y0 - halfB, Math.max(1, right - left), 1);
    ctx.fillRect(left, y0 + halfB - 1, Math.max(1, right - left), 1);
  }

  // Soft lamp tip (keep faintly visible, no hotspot)
  ctx.fillStyle = withAlpha('#ffffe8', 0.18);
  ctx.beginPath();
  ctx.arc(x0 + (dir > 0 ? 1 : -1), y0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha('#e8ecff', 0.1);
  ctx.fillRect(x0 + (dir > 0 ? 2 : -8), y0 - 1, 6, 2);
}

/**
 * Composite lighting onto the main canvas.
 * `camX` scrolls world-space lights; screenSpace lights ignore it.
 *
 * When `artScale` > 1 the light buffer is rendered at internal resolution
 * (logical × artScale) and blitted with an identity-aware transform so
 * Hi-DPI frames keep sharp fire/headlight edges.
 */
export function applyLightingOverlay(
  ctx: CanvasRenderingContext2D,
  camX: number,
  viewW: number,
  viewH: number,
  frame: LightingFrame,
  artScale = 1,
): void {
  const scale = Math.max(1, Math.round(artScale));
  const bufW = viewW * scale;
  const bufH = viewH * scale;
  const buf = ensureBuffer(bufW, bufH);
  buf.setTransform(scale, 0, 0, scale, 0, 0);
  buf.imageSmoothingEnabled = true;
  buf.clearRect(0, 0, viewW, viewH);

  const ox = Math.round(camX);

  // Fire / point lights (logical coordinates; buffer transform scales them)
  for (const p of frame.points) {
    const flicker =
      p.kind === 'fire'
        ? 0.82 + 0.18 * Math.sin(frame.time * 9 + (p.phase ?? 0)) * Math.sin(frame.time * 13.7 + (p.phase ?? 1))
        : 1;
    const sx = p.screenSpace ? p.x : p.x - ox;
    const sy = p.y;
    const r = p.radius * (p.kind === 'fire' ? flicker : 1);
    drawSoftDisc(buf, sx, sy, r, p.color, p.kind === 'fire' ? 1.0 : 0.8);
    if (p.kind === 'fire') {
      drawSoftDisc(buf, sx, sy - 2, r * 0.45, '#ffe8a0', 0.78 * flicker);
    }
  }

  // Headlight cones
  for (const c of frame.cones) {
    const localOx = c.screenSpace ? 0 : ox;
    drawHeadlightCone(buf, c, localOx);
  }

  // Reset buffer transform before reading pixels for drawImage sizing.
  buf.setTransform(1, 0, 0, 1, 0, 0);

  // Snapshot current main transform so we can blit in buffer-pixel space.
  const prev = ctx.getTransform();
  const logicalToBuffer = prev.a; // uniform scale from configureDisplay
  const bufferMult = scale > 0 ? logicalToBuffer / scale : logicalToBuffer;

  // 1) Ambient multiply on main scene (logical space via existing transform)
  ctx.save();
  ctx.setTransform(prev);
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = frame.ambient.color;
  ctx.fillRect(0, 0, viewW, viewH);

  // 2) Screen-blend additive lights — soft blit so blooms aren't stair-stepped
  ctx.setTransform(bufferMult, 0, 0, bufferMult, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lightBuf!, 0, 0);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
}

/** Helpers to spawn rynok trash fires / cars. */
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
