/**
 * Hi-DPI display math for Novgorod 1995.
 *
 * Logical game space stays Genesis-like 320×224 so gameplay, hotspots, and
 * authored pixel art keep working unchanged. Art is rendered into a 2×
 * internal buffer (640×448) — an integer scale of every logical pixel — then
 * the canvas backing store matches devicePixelRatio so retina / 2K screens
 * stay crisp with `imageSmoothingEnabled = false`.
 */

/** Game / HUD / hit-test coordinate space (unchanged from v1). */
export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 224;

/**
 * Integer art scale from logical → internal buffer.
 * 2× → 640×448: crisp on phones & 2K without rewriting sprite grids.
 */
export const ART_SCALE = 2;

/** Internal pixel buffer before DPR (logical × ART_SCALE). */
export const INTERNAL_WIDTH = LOGICAL_WIDTH * ART_SCALE;
export const INTERNAL_HEIGHT = LOGICAL_HEIGHT * ART_SCALE;

export interface DisplayMetrics {
  /** CSS letterboxed width (layout pixels). */
  cssWidth: number;
  /** CSS letterboxed height (layout pixels). */
  cssHeight: number;
  /** Backing-store width in device pixels. */
  bufferWidth: number;
  /** Backing-store height in device pixels. */
  bufferHeight: number;
  /** devicePixelRatio used for this configure pass. */
  dpr: number;
  /**
   * Integer multiples of the internal buffer packed into the backing store
   * (usually ≥ 1; grows on high-DPR / large windows).
   */
  bufferMult: number;
  /** Current transform scale: logical unit → backing pixel. */
  logicalToBuffer: number;
}

let lastMetrics: DisplayMetrics = {
  cssWidth: INTERNAL_WIDTH,
  cssHeight: INTERNAL_HEIGHT,
  bufferWidth: INTERNAL_WIDTH,
  bufferHeight: INTERNAL_HEIGHT,
  dpr: 1,
  bufferMult: 1,
  logicalToBuffer: ART_SCALE,
};

export function getDisplayMetrics(): DisplayMetrics {
  return lastMetrics;
}

/**
 * Size the canvas CSS box (letterboxed) and backing store (DPR-aware),
 * then set a transform so draw calls use LOGICAL coordinates.
 */
export function configureDisplay(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): DisplayMetrics {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Fit internal aspect into the viewport (letterbox / pillarbox via #app).
  const fit = Math.min(vw / INTERNAL_WIDTH, vh / INTERNAL_HEIGHT);
  const cssWidth = Math.max(1, Math.floor(INTERNAL_WIDTH * fit));
  const cssHeight = Math.max(1, Math.floor(INTERNAL_HEIGHT * fit));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  // Prefer an integer multiple of the internal buffer so nearest-neighbor
  // stays sharp when the browser maps backing → CSS.
  const idealMult = (cssWidth * dpr) / INTERNAL_WIDTH;
  const bufferMult = Math.max(1, Math.round(idealMult) || 1);
  const bufferWidth = INTERNAL_WIDTH * bufferMult;
  const bufferHeight = INTERNAL_HEIGHT * bufferMult;

  if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
  if (canvas.height !== bufferHeight) canvas.height = bufferHeight;

  const logicalToBuffer = ART_SCALE * bufferMult;
  ctx.setTransform(logicalToBuffer, 0, 0, logicalToBuffer, 0, 0);
  ctx.imageSmoothingEnabled = false;

  lastMetrics = {
    cssWidth,
    cssHeight,
    bufferWidth,
    bufferHeight,
    dpr,
    bufferMult,
    logicalToBuffer,
  };
  return lastMetrics;
}

/** Re-assert crisp transform after any context-mutating call. */
export function assertCrispTransform(ctx: CanvasRenderingContext2D): void {
  const m = lastMetrics;
  ctx.setTransform(m.logicalToBuffer, 0, 0, m.logicalToBuffer, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

/** Map a client pointer into logical canvas space (320×224). */
export function clientToLogical(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
  const y = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
  return { x, y };
}
