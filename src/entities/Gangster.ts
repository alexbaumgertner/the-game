/**
 * Gangster — street thug AI opponent.
 *
 * TODO Phase 4:
 * - Patrol / chase / attack state machine
 * - Separation from other gangsters
 * - Hit reaction & KO → loot drop
 * - Difficulty tiers (slow punch vs combo)
 */

export type GangsterAiState = 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'ko';

export interface GangsterConfig {
  x?: number;
  y?: number;
  hp?: number;
}

export class Gangster {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = -1;
  hp: number;
  ai: GangsterAiState = 'idle';

  constructor(config: GangsterConfig = {}) {
    this.x = config.x ?? 200;
    this.y = config.y ?? 120;
    this.hp = config.hp ?? 40;
  }

  /** AI tick — stub until Phase 4. */
  update(_dt: number): void {
    // TODO: sense player, transition ai states, apply velocity
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    const w = 12;
    const h = 18;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    ctx.fillStyle = '#c44c4c';
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(2, -h + 4, 2, 2);
    ctx.restore();
  }
}
