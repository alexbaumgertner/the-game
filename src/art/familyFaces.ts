/**
 * Photo-quality face crops from public/art/family-photo.png
 * (son = hero/Зуич, mother, father) for sprite compositing.
 */

const BASE = import.meta.env.BASE_URL;

export type FamilyFaceId = 'hero' | 'mother' | 'father' | 'sister';

type FaceSlot = {
  url: string;
  img: HTMLImageElement | null;
  ready: boolean;
};

const faces: Record<FamilyFaceId, FaceSlot> = {
  hero: { url: `${BASE}art/face-hero.png`, img: null, ready: false },
  mother: { url: `${BASE}art/face-mother.png`, img: null, ready: false },
  father: { url: `${BASE}art/face-father.png`, img: null, ready: false },
  sister: { url: `${BASE}art/face-sister.png`, img: null, ready: false },
};

let loadStarted = false;

function ensure(id: FamilyFaceId): void {
  const slot = faces[id];
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

/** Preload face crops (call from bootstrap / scene enter). */
export function preloadFamilyFaces(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const id of Object.keys(faces) as FamilyFaceId[]) ensure(id);
}

export function isFamilyFaceReady(id: FamilyFaceId): boolean {
  preloadFamilyFaces();
  return faces[id].ready && !!faces[id].img;
}

/**
 * Draw a circular/oval photo face into a sprite head slot.
 * Uses high-quality smoothing; clips to an oval matching the head.
 */
export function drawFamilyFace(
  ctx: CanvasRenderingContext2D,
  id: FamilyFaceId,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  preloadFamilyFaces();
  const slot = faces[id];
  if (!slot.ready || !slot.img) return false;

  const prevSmooth = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const iw = slot.img.naturalWidth || slot.img.width;
  const ih = slot.img.naturalHeight || slot.img.height;
  // Cover-fit with slight upward bias (forehead)
  const scale = Math.max(w / iw, h / ih) * 1.08;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2 - h * 0.04;
  ctx.drawImage(slot.img, dx, dy, dw, dh);
  ctx.restore();
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.imageSmoothingQuality = prevQuality;
  return true;
}

/** Soft rim so photo head sits on pixel body. */
export function drawFamilyFaceWithRim(
  ctx: CanvasRenderingContext2D,
  id: FamilyFaceId,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const ok = drawFamilyFace(ctx, id, x, y, w, h);
  if (!ok) return false;
  ctx.save();
  ctx.strokeStyle = 'rgba(20, 14, 12, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 0.5, h / 2 - 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return true;
}
