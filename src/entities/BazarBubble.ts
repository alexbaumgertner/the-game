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
  life = 1.45;
  /** Frames before collision arms — avoids point-blank instant despawn. */
  armDelay = 0.12;
  hit = false;
  /** Linger after contact so the slang is readable. */
  hitLinger = 0;
  readonly width: number;
  readonly height = 14;

  constructor(config: BazarBubbleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.facing = config.facing;
    this.vx = config.facing * 100;
    this.phrase =
      config.phrase ??
      BAZAR_PHRASES[Math.floor(Math.random() * BAZAR_PHRASES.length)]!;
    this.width = measureNesText(this.phrase, 1, 1) + 10;
  }

  get alive(): boolean {
    return this.life > 0 || this.hitLinger > 0;
  }

  /** True once armed and not yet spent. */
  get canHit(): boolean {
    return !this.hit && this.armDelay <= 0 && this.life > 0;
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
    if (this.armDelay > 0) this.armDelay -= dt;
    if (this.hit) {
      this.hitLinger -= dt;
      this.vx *= Math.pow(0.01, dt);
      this.x += this.vx * dt * 0.3;
      return;
    }
    this.x += this.vx * dt;
    this.life -= dt;
  }

  markHit(): void {
    if (this.hit) return;
    this.hit = true;
    this.hitLinger = 0.55;
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
