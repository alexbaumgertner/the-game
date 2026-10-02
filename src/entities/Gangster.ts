/**
 * Gangster — street thug AI for rynok combat.
 * Chase when aggro'd, punch in melee range, stun from Bazar slang.
 */

import { TEEN_PAL, SEGA } from '@/art/segaPalette';
import { blitGrid } from '@/art/pixelDraw';
import { bodyRect, type Rect } from '@/systems/CombatMath';

export type GangsterAiState =
  | 'idle'
  | 'chase'
  | 'attack'
  | 'hurt'
  | 'stun'
  | 'ko';

export type GangsterVariant = 'thug' | 'tracksuit';

export interface GangsterConfig {
  x?: number;
  y?: number;
  hp?: number;
  /** Wave-2 track-suit extortionists. */
  variant?: GangsterVariant;
  /** Drops mother's stolen coat on KO. */
  carriesCoat?: boolean;
}

const GW = 14;
const GH = 22;

type Cell = string | null;

function gangsterFrame(
  facingIdle: boolean,
  punch: boolean,
  hurt: boolean,
  variant: GangsterVariant = 'thug',
): Cell[] {
  const g: Cell[] = Array(GW * GH).fill(null);
  const set = (x: number, y: number, c: Cell) => {
    if (x < 0 || x >= GW || y < 0 || y >= GH) return;
    g[y * GW + x] = c;
  };
  const o = SEGA.ink;
  const skin = '#c89870';
  const skinD = '#906048';
  const track = variant === 'tracksuit';
  const coat = track ? '#2a5888' : '#5a3038';
  const coatH = track ? '#3a78b0' : '#784850';
  const coatD = track ? '#183858' : '#381820';
  const pants = track ? '#1a4068' : '#2a2838';
  const pantsH = track ? '#2a5888' : '#3a3850';
  const shoes = '#18141c';
  const hair = '#1a1420';
  const stripe = '#f0d040';

  // Hair
  for (let x = 4; x <= 9; x++) set(x, 0, hair);
  for (let x = 3; x <= 10; x++) set(x, 1, hair);
  // Head
  for (let y = 2; y <= 6; y++) {
    for (let x = 4; x <= 9; x++) set(x, y, skin);
  }
  set(5, 3, o);
  set(8, 3, o);
  set(6, 5, skinD);
  set(7, 5, skinD);
  if (hurt) {
    set(5, 4, '#e04040');
    set(8, 4, '#e04040');
  }
  // Coat / tracksuit top
  for (let y = 7; y <= 14; y++) {
    for (let x = 3; x <= 10; x++) set(x, y, coat);
  }
  set(4, 8, coatH);
  set(5, 8, coatH);
  set(3, 10, coatD);
  set(10, 10, coatD);
  if (track) {
    // Adidas-ish side stripe
    set(3, 8, stripe);
    set(3, 9, stripe);
    set(3, 11, stripe);
    set(3, 12, stripe);
    set(10, 8, stripe);
    set(10, 9, stripe);
  }
  // Arms
  if (punch) {
    for (let x = 11; x <= 13; x++) {
      set(x, 9, skin);
      set(x, 10, skin);
    }
    set(13, 9, skinD);
  } else if (facingIdle) {
    set(2, 9, skin);
    set(1, 10, skin);
    set(11, 9, skin);
    set(12, 10, skin);
  } else {
    set(1, 9, skin);
    set(0, 10, skin);
    set(12, 9, skin);
    set(13, 10, skin);
  }
  // Pants / shoes
  for (let y = 15; y <= 18; y++) {
    for (let x = 4; x <= 6; x++) set(x, y, pants);
    for (let x = 7; x <= 9; x++) set(x, y, pants);
  }
  set(4, 15, pantsH);
  set(7, 15, pantsH);
  for (let x = 3; x <= 5; x++) {
    set(x, 19, shoes);
    set(x, 20, shoes);
  }
  for (let x = 8; x <= 10; x++) {
    set(x, 19, shoes);
    set(x, 20, shoes);
  }
  return g;
}

export class Gangster {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = -1;
  hp: number;
  maxHp: number;
  ai: GangsterAiState = 'idle';
  variant: GangsterVariant;
  carriesCoat: boolean;
  /** Set true once when KO if they carried the coat. */
  droppedCoat = false;
  /** Chase speed multiplier (calm father → slightly slower wave 2). */
  speedMul = 1;
  readonly width = GW;
  readonly height = GH;

  private attackTimer = 0;
  private hurtTimer = 0;
  private stunTimer = 0;
  private attackHitDone = false;
  private koTimer = 0;
  private animTime = 0;

  constructor(config: GangsterConfig = {}) {
    this.x = config.x ?? 200;
    this.y = config.y ?? 120;
    this.hp = config.hp ?? 36;
    this.maxHp = this.hp;
    this.variant = config.variant ?? 'thug';
    this.carriesCoat = config.carriesCoat ?? false;
  }

  get alive(): boolean {
    return this.ai !== 'ko' || this.koTimer > 0;
  }

  get isKo(): boolean {
    return this.ai === 'ko';
  }

  body(): Rect {
    return bodyRect(this.x, this.y, this.width - 2, this.height);
  }

  attackHitbox(): Rect | null {
    if (this.ai !== 'attack') return null;
    // Active frames while wind-up has finished
    if (this.attackTimer > 0.22 || this.attackTimer <= 0.05) return null;
    const reach = 16;
    return {
      x: this.facing > 0 ? this.x + 2 : this.x - reach - 2,
      y: this.y - 18,
      w: reach,
      h: 12,
    };
  }

  /** Scene calls once when punch connects. */
  consumeAttackHit(): number {
    if (this.attackHitDone || this.ai !== 'attack') return 0;
    if (this.attackTimer > 0.22 || this.attackTimer <= 0.05) return 0;
    this.attackHitDone = true;
    return 14;
  }

  takeHit(damage: number, knockFacing: 1 | -1, knock = 55): void {
    if (this.ai === 'ko') return;
    this.hp -= damage;
    this.vx = knockFacing * knock;
    this.hurtTimer = 0.28;
    this.ai = 'hurt';
    this.attackTimer = 0;
    this.attackHitDone = false;
    if (this.hp <= 0) {
      this.hp = 0;
      this.ai = 'ko';
      this.koTimer = 1.4;
      this.vx = knockFacing * 80;
      this.markCoatDrop();
    }
  }

  /** Bazar slang stun — longer lock + stronger knockback. */
  takeBazarStun(knockFacing: 1 | -1): void {
    if (this.ai === 'ko') return;
    this.hp -= 8;
    this.vx = knockFacing * 110;
    this.stunTimer = 1.1;
    this.ai = 'stun';
    this.attackTimer = 0;
    if (this.hp <= 0) {
      this.hp = 0;
      this.ai = 'ko';
      this.koTimer = 1.4;
      this.markCoatDrop();
    }
  }

  /** Returns coat drop world pos once when first KO'd while carrying. */
  consumeCoatDrop(): { x: number; y: number } | null {
    if (!this.droppedCoat) return null;
    this.droppedCoat = false;
    this.carriesCoat = false;
    return { x: this.x, y: this.y - 8 };
  }

  private markCoatDrop(): void {
    if (this.carriesCoat && !this.droppedCoat) {
      this.droppedCoat = true;
    }
  }

  /**
   * Tick AI toward player world position.
   * floorY = feet Y; world bounds for clamp.
   */
  update(
    dt: number,
    playerX: number,
    _playerY: number,
    floorY: number,
    minX: number,
    maxX: number,
  ): void {
    this.animTime += dt;
    this.y = floorY;

    if (this.ai === 'ko') {
      this.koTimer -= dt;
      this.vx *= Math.pow(0.05, dt);
      this.x += this.vx * dt;
      return;
    }

    if (this.ai === 'hurt') {
      this.hurtTimer -= dt;
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.02, dt);
      if (this.hurtTimer <= 0) this.ai = 'chase';
      this.clamp(minX, maxX);
      return;
    }

    if (this.ai === 'stun') {
      this.stunTimer -= dt;
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.08, dt);
      if (this.stunTimer <= 0) this.ai = 'chase';
      this.clamp(minX, maxX);
      return;
    }

    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;

    const aggro = 160;
    const melee = 18;

    if (this.ai === 'attack') {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.ai = 'chase';
        this.attackHitDone = false;
      }
      this.clamp(minX, maxX);
      return;
    }

    if (dist < aggro || this.ai === 'chase') {
      this.ai = 'chase';
      if (dist > melee) {
        const speed = 42 * this.speedMul;
        this.vx = this.facing * speed;
        this.x += this.vx * dt;
      } else {
        this.vx = 0;
        this.ai = 'attack';
        this.attackTimer = 0.38;
        this.attackHitDone = false;
      }
    } else {
      this.ai = 'idle';
      this.vx = 0;
    }

    this.clamp(minX, maxX);
  }

  private clamp(minX: number, maxX: number): void {
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (this.ai === 'ko' && this.koTimer <= 0) return;
    const punch = this.ai === 'attack' && this.attackTimer < 0.28;
    const hurt = this.ai === 'hurt' || this.ai === 'stun';
    const walkBob = this.ai === 'chase' && Math.floor(this.animTime * 8) % 2 === 0;
    const cells = gangsterFrame(!walkBob, punch, hurt, this.variant);
    const ox = Math.round(this.x);
    const oy = Math.round(this.y);
    const flash = this.ai === 'stun' && Math.floor(this.animTime * 14) % 2 === 0;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(this.facing, 1);
    if (flash) {
      // Tint via brighter overlay rect after blit
    }
    blitGrid(ctx, -Math.floor(GW / 2), -GH, GW, GH, cells, 1);
    if (this.ai === 'stun') {
      ctx.fillStyle = 'rgba(240, 200, 64, 0.35)';
      ctx.fillRect(-Math.floor(GW / 2), -GH, GW, GH);
    }
    if (this.ai === 'ko') {
      ctx.globalAlpha = Math.min(1, this.koTimer);
    }
    ctx.restore();

    // Tiny HP pip
    if (!this.isKo) {
      const bw = 16;
      const filled = Math.round((this.hp / this.maxHp) * bw);
      ctx.fillStyle = '#1a1018';
      ctx.fillRect(ox - 8, oy - GH - 5, bw, 3);
      ctx.fillStyle = TEEN_PAL.scarf;
      ctx.fillRect(ox - 8, oy - GH - 5, filled, 3);
    }
  }
}
