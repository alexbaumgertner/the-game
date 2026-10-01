/** Shared AABB helpers for arcade combat. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function aabbOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function bodyRect(
  x: number,
  y: number,
  w: number,
  h: number,
): Rect {
  return { x: x - w / 2, y: y - h, w, h };
}
