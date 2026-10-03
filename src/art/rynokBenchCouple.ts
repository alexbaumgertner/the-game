/**
 * Photo-quality «Вокзал для двоих» cutout on the Level 1 market bus-stop bench.
 * Source: public/art/rynok-bench-couple.png (man with sunglasses + woman with curls + melon).
 */

const BASE = import.meta.env.BASE_URL;

type Slot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const slot: Slot = {
  url: `${BASE}art/rynok-bench-couple.png`,
  img: null,
  ready: false,
};

let loadStarted = false;

function ensure(): void {
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

/** Idempotent preload — call from rynok enter / bootstrap. */
export function preloadRynokBenchCouple(): void {
  if (loadStarted) return;
  loadStarted = true;
  ensure();
}

export function rynokBenchCoupleReady(): boolean {
  preloadRynokBenchCouple();
  return slot.ready && !!slot.img;
}

/**
 * Draw Station-for-Two couple seated on/near the bus-stop bench.
 * `x` / `floorY` match `drawBusStop` origin (shelter left, ground line).
 */
export function drawRynokBenchCouple(
  ctx: CanvasRenderingContext2D,
  busStopX: number,
  floorY: number,
): void {
  preloadRynokBenchCouple();
  if (!slot.ready || !slot.img) return;

  const nw = slot.img.naturalWidth || slot.img.width;
  const nh = slot.img.naturalHeight || slot.img.height;
  if (nw <= 0 || nh <= 0) return;

  // Sit under the blue-glass shelter; wide enough to read faces + melon.
  const drawW = 62;
  const drawH = (nh / nw) * drawW;
  // Align cutout bench with pixel seat (~floorY - 12); slight inset under roof.
  const dx = busStopX - 4;
  const dy = floorY - drawH + 1;

  const prevSmooth = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Soft contact shadow on plinth
  ctx.fillStyle = 'rgba(12, 14, 18, 0.28)';
  ctx.beginPath();
  ctx.ellipse(dx + drawW * 0.5, floorY - 1, drawW * 0.42, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(slot.img, dx, dy, drawW, drawH);
  // Cool dusk wash so photo sits in market evening light
  ctx.fillStyle = 'rgba(28, 40, 56, 0.12)';
  ctx.fillRect(dx, dy, drawW, drawH);
  ctx.restore();
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.imageSmoothingQuality = prevQuality;
}
