/**
 * Neo-Noir dynamic lighting — Canvas blend modes over the pixel buffer.
 *
 * Pipeline (after gameplay, before HUD):
 *   1. Ambient multiply wash (cold winter night)
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

/** Soft radial disc via concentric filled rect rings (pixel-friendly). */
function drawSoftDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  strength = 1,
): void {
  const steps = Math.max(4, Math.min(14, Math.floor(radius / 3)));
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const r = Math.round(radius * t);
    const a = strength * (1 - t) * (1 - t);
    ctx.fillStyle = withAlpha(color, a);
    // Diamond-ish soft blob (cheaper than arc, reads retro)
    const ix = Math.round(cx) - r;
    const iy = Math.round(cy) - r;
    ctx.fillRect(ix + Math.floor(r * 0.25), iy, r * 2 - Math.floor(r * 0.5), r * 2);
    ctx.fillRect(ix, iy + Math.floor(r * 0.25), r * 2, r * 2 - Math.floor(r * 0.5));
  }
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

  // Layered trapezoids approximating a cone (screen blend later)
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const xA = x0 + Math.round(dir * len * t0);
    const xB = x0 + Math.round(dir * len * t1);
    const halfA = Math.round(spread * t0 * 0.35 + 1);
    const halfB = Math.round(spread * t1);
    const a = 0.22 * (1 - t0);
    ctx.fillStyle = withAlpha(cone.color, a);
    const left = Math.min(xA, xB);
    const right = Math.max(xA, xB);
    const top = y0 - Math.max(halfA, halfB);
    const bot = y0 + Math.max(halfA, halfB);
    ctx.fillRect(left, top, Math.max(1, right - left), bot - top);
    // Taper edges
    ctx.fillStyle = withAlpha(cone.color, a * 0.55);
    ctx.fillRect(left, y0 - halfB, Math.max(1, right - left), 1);
    ctx.fillRect(left, y0 + halfB - 1, Math.max(1, right - left), 1);
  }

  // Hot core near lamp
  ctx.fillStyle = withAlpha('#ffffff', 0.55);
  ctx.fillRect(x0 + (dir > 0 ? 0 : -4), y0 - 2, 4, 4);
}

/**
 * Composite lighting onto the main canvas.
 * `camX` scrolls world-space lights; screenSpace lights ignore it.
 */
export function applyLightingOverlay(
  ctx: CanvasRenderingContext2D,
  camX: number,
  viewW: number,
  viewH: number,
  frame: LightingFrame,
): void {
  const buf = ensureBuffer(viewW, viewH);
  buf.imageSmoothingEnabled = false;
  buf.clearRect(0, 0, viewW, viewH);

  // --- Ambient multiply base on buffer ---
  buf.globalCompositeOperation = 'source-over';
  buf.fillStyle = frame.ambient.color;
  buf.fillRect(0, 0, viewW, viewH);

  // Punch holes / add light with destination-out then we'll screen-blend adds
  // Better Neo-Noir: start dark multiply on main, screen lights on top.
  // Rebuild: clear buffer, paint lights only, then multiply ambient on main + screen lights.
  buf.clearRect(0, 0, viewW, viewH);

  const ox = Math.round(camX);

  // Fire / point lights
  for (const p of frame.points) {
    const flicker =
      p.kind === 'fire'
        ? 0.82 + 0.18 * Math.sin(frame.time * 9 + (p.phase ?? 0)) * Math.sin(frame.time * 13.7 + (p.phase ?? 1))
        : 1;
    const sx = p.screenSpace ? p.x : p.x - ox;
    const sy = p.y;
    const r = p.radius * (p.kind === 'fire' ? flicker : 1);
    drawSoftDisc(buf, sx, sy, r, p.color, p.kind === 'fire' ? 0.95 : 0.75);
    if (p.kind === 'fire') {
      drawSoftDisc(buf, sx, sy - 2, r * 0.45, '#ffe8a0', 0.7 * flicker);
    }
  }

  // Headlight cones
  for (const c of frame.cones) {
    const localOx = c.screenSpace ? 0 : ox;
    drawHeadlightCone(buf, c, localOx);
  }

  // 1) Ambient multiply on main scene
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = frame.ambient.color;
  ctx.fillRect(0, 0, viewW, viewH);

  // 2) Screen-blend additive lights from buffer
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(lightBuf!, 0, 0);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
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
  length = 90,
  spread = 18,
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
