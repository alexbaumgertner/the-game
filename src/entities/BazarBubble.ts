/**
 * Kinetic slang text-bubble projectile — Bazar special stun.
 * Fired when Street Swagger is spent; knocks back / stuns thugs.
 */

import { segaBox } from '@/art/pixelDraw';
import { drawNesText, measureNesText } from '@/art/nesFont';
import { SEGA } from '@/art/segaPalette';

export const BAZAR_PHRASES = [
  'ЧЁ ПОПУТАЛ?!',
  'БАЗАР ФИЛЬТРУЙ!',
  'ОТВАЛИ!',
  'ТЫ ЧЁ?!',
] as const;

export interface BazarBubbleConfig {
  x: number;
  y: number;
  facing: 1 | -1;
  phrase?: string;
}

export class BazarBubble {
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  phrase: string;
  life = 1.15;
  hit = false;
  readonly width: number;
  readonly height = 14;

  constructor(config: BazarBubbleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.facing = config.facing;
    this.vx = config.facing * 140;
    this.phrase =
      config.phrase ??
      BAZAR_PHRASES[Math.floor(Math.random() * BAZAR_PHRASES.length)]!;
    this.width = measureNesText(this.phrase, 1, 1) + 10;
  }

  get alive(): boolean {
    return this.life > 0 && !this.hit;
  }

  /** AABB for stun contact. */
  hitbox(): { x: number; y: number; w: number; h: number } {
    const w = this.width;
    return {
      x: this.facing > 0 ? this.x : this.x - w,
      y: this.y - this.height,
      w,
      h: this.height,
    };
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.life -= dt;
  }

  markHit(): void {
    this.hit = true;
    this.life = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    const boxX = Math.round(this.facing > 0 ? this.x : this.x - this.width);
    const boxY = Math.round(this.y - this.height);
    segaBox(ctx, boxX, boxY, this.width, this.height, '#201018', '#f0c040', {
      borderDark: '#a05020',
      fillHi: '#382028',
      inset: false,
    });
    drawNesText(ctx, this.phrase, boxX + 5, boxY + 4, SEGA.white, 1, 1);
    // Tail toward speaker
    const tx = this.facing > 0 ? boxX - 3 : boxX + this.width;
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(tx, boxY + 8, 3, 2);
  }
}
