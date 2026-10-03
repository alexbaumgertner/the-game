/**
 * Player entity — dual-era Genesis sprites + Phase 3 arcade combat.
 *
 * Mental Fortitude drives survivability; Street Swagger fuels Bazar shouts.
 */

import { drawPlayerSprite, SPRITE_SIZES, type PlayerSpriteKind } from '@/art/playerSprites';
import { bodyRect, type Rect } from '@/systems/CombatMath';
import { drawFamilyFaceWithRim, preloadFamilyFaces } from '@/art/familyFaces';
import { BazarBubble } from '@/entities/BazarBubble';

/** Childhood (1990s flashback) sprite states. */
export type TeenAnimState =
  | 'teen_idle'
  | 'teen_walk'
  | 'teen_run'
  | 'teen_jump'
  | 'teen_fall'
  | 'teen_crouch'
  | 'teen_punch'
  | 'teen_kick'
  | 'teen_bazar_shout'
  | 'teen_inspect'
  | 'teen_hurt'
  | 'teen_ko';

/** Adult (present-day) sprite states. */
export type AdultAnimState =
  | 'adult_idle'
  | 'adult_walk'
  | 'adult_run'
  | 'adult_jump'
  | 'adult_fall'
  | 'adult_crouch'
  | 'adult_punch'
  | 'adult_kick'
  | 'adult_inspect'
  | 'adult_hurt'
  | 'adult_ko';

export type PlayerAnimState = TeenAnimState | AdultAnimState;

export type PlayerEra = 'teen' | 'adult';

/** Frame indices (or atlas keys) for one animation clip. */
export interface AnimClip {
  frames: readonly string[];
  /** Frames per second. */
  fps: number;
  loop: boolean;
}

/** Complete animation map for one era. */
export type EraAnimMap<S extends string> = Record<S, AnimClip>;

export type TeenAnimMap = EraAnimMap<TeenAnimState>;
export type AdultAnimMap = EraAnimMap<AdultAnimState>;

export const TEEN_ANIM_MAP: TeenAnimMap = {
  /** Brawler bounce idle — 4 sub-steps. */
  teen_idle: {
    frames: ['teen_idle_0', 'teen_idle_1', 'teen_idle_2', 'teen_idle_3'],
    fps: 8,
    loop: true,
  },
  teen_walk: {
    frames: [
      'teen_walk_0',
      'teen_walk_1',
      'teen_walk_2',
      'teen_walk_3',
      'teen_walk_4',
      'teen_walk_5',
    ],
    fps: 12,
    loop: true,
  },
  /** Lean sprint — 6 sub-steps. */
  teen_run: {
    frames: [
      'teen_run_0',
      'teen_run_1',
      'teen_run_2',
      'teen_run_3',
      'teen_run_4',
      'teen_run_5',
    ],
    fps: 16,
    loop: true,
  },
  teen_jump: { frames: ['teen_jump_0'], fps: 1, loop: false },
  teen_fall: { frames: ['teen_fall_0'], fps: 1, loop: false },
  teen_crouch: { frames: ['teen_crouch_0'], fps: 1, loop: false },
  /** Punch combo wind → jab → extend → recover. */
  teen_punch: {
    frames: ['teen_punch_0', 'teen_punch_1', 'teen_punch_2', 'teen_punch_3'],
    fps: 14,
    loop: false,
  },
  teen_kick: {
    frames: ['teen_kick_0', 'teen_kick_1', 'teen_kick_2'],
    fps: 12,
    loop: false,
  },
  teen_bazar_shout: {
    frames: ['teen_bazar_0', 'teen_bazar_1'],
    fps: 12,
    loop: false,
  },
  teen_inspect: {
    frames: ['teen_inspect_0', 'teen_inspect_1', 'teen_inspect_2', 'teen_inspect_3'],
    fps: 8,
    loop: true,
  },
  teen_hurt: { frames: ['teen_hurt_0', 'teen_hurt_1'], fps: 10, loop: false },
  teen_ko: { frames: ['teen_ko_0'], fps: 1, loop: false },
};

export const ADULT_ANIM_MAP: AdultAnimMap = {
  /** Breathing idle — 4 sub-steps. */
  adult_idle: {
    frames: ['adult_idle_0', 'adult_idle_1', 'adult_idle_2', 'adult_idle_3'],
    fps: 6,
    loop: true,
  },
  adult_walk: {
    frames: [
      'adult_walk_0',
      'adult_walk_1',
      'adult_walk_2',
      'adult_walk_3',
      'adult_walk_4',
      'adult_walk_5',
    ],
    fps: 11,
    loop: true,
  },
  adult_run: {
    frames: [
      'adult_run_0',
      'adult_run_1',
      'adult_run_2',
      'adult_run_3',
      'adult_run_4',
      'adult_run_5',
    ],
    fps: 13,
    loop: true,
  },
  adult_jump: { frames: ['adult_jump_0'], fps: 1, loop: false },
  adult_fall: { frames: ['adult_fall_0'], fps: 1, loop: false },
  adult_crouch: { frames: ['adult_crouch_0'], fps: 1, loop: false },
  adult_punch: { frames: ['adult_punch_0', 'adult_punch_1'], fps: 10, loop: false },
  adult_kick: { frames: ['adult_kick_0', 'adult_kick_1'], fps: 10, loop: false },
  /** Hand-reach inspect with pulse. */
  adult_inspect: {
    frames: [
      'adult_inspect_0',
      'adult_inspect_1',
      'adult_inspect_2',
      'adult_inspect_3',
    ],
    fps: 8,
    loop: true,
  },
  adult_hurt: { frames: ['adult_hurt_0'], fps: 1, loop: false },
  adult_ko: { frames: ['adult_ko_0'], fps: 1, loop: false },
};

/** Max Mental Fortitude — 30× Phase 3 baseline (100) so rynok fights stay durable. */
export const MAX_FORTITUDE = 3000;
export const MAX_SWAGGER = 100;
export const BAZAR_COST = 40;

export interface PlayerConfig {
  x?: number;
  y?: number;
  era?: PlayerEra;
}

type CombatLock = 'none' | 'punch' | 'kick' | 'bazar' | 'hurt' | 'ko';

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  era: PlayerEra;
  animState: PlayerAnimState;
  facing: 1 | -1 = 1;
  /** Synced to mentalFortitude for HUD back-compat. */
  hp = MAX_FORTITUDE;
  /** Psychological meter — drained by gangster hits; 0 = Game Over. */
  mentalFortitude = MAX_FORTITUDE;
  /** Fills on successful hits; spent for Bazar special. */
  streetSwagger = 0;
  /** Horizontal walk speed (px/s). */
  walkSpeed = 55;
  /** True while an inspect pose is locked (blocks movement). */
  inspecting = false;
  grounded = true;
  invuln = 0;
  /** Remaining screen-shake seconds after Bazar shout. */
  bazarShake = 0;

  private animTime = 0;
  private inspectTimer = 0;
  private combatLock: CombatLock = 'none';
  private combatTimer = 0;
  private attackHitDone = false;
  private gravity = 520;
  private jumpVel = -195;
  private floorY = 188;

  constructor(config: PlayerConfig = {}) {
    this.x = config.x ?? 40;
    this.y = config.y ?? 120;
    this.era = config.era ?? 'adult';
    this.animState = this.era === 'teen' ? 'teen_idle' : 'adult_idle';
  }

  get animMap(): TeenAnimMap | AdultAnimMap {
    return this.era === 'teen' ? TEEN_ANIM_MAP : ADULT_ANIM_MAP;
  }

  get width(): number {
    return this.era === 'teen' ? SPRITE_SIZES.teen.w : SPRITE_SIZES.adult.w;
  }

  get height(): number {
    return this.era === 'teen' ? SPRITE_SIZES.teen.h : SPRITE_SIZES.adult.h;
  }

  get isCombatLocked(): boolean {
    return this.combatLock !== 'none' || this.inspecting;
  }

  get isKo(): boolean {
    return this.combatLock === 'ko' || this.mentalFortitude <= 0;
  }

  setFloorY(y: number): void {
    this.floorY = y;
  }

  setEra(era: PlayerEra): void {
    this.era = era;
    this.animState = era === 'teen' ? 'teen_idle' : 'adult_idle';
    this.animTime = 0;
    this.inspecting = false;
    this.inspectTimer = 0;
    this.combatLock = 'none';
    this.combatTimer = 0;
  }

  setAnim(state: PlayerAnimState): void {
    if (this.animState === state) return;
    this.animState = state;
    this.animTime = 0;
  }

  /** Reset combat meters / locks (apartment return / scene enter). */
  resetCombatProgress(opts?: { fortitude?: number; swagger?: number }): void {
    this.mentalFortitude = opts?.fortitude ?? MAX_FORTITUDE;
    this.streetSwagger = opts?.swagger ?? 0;
    this.hp = this.mentalFortitude;
    this.combatLock = 'none';
    this.combatTimer = 0;
    this.attackHitDone = false;
    this.invuln = 0;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.inspecting = false;
  }

  syncHp(): void {
    this.hp = Math.max(0, Math.round(this.mentalFortitude));
  }

  /** Begin a short inspect pose (adult_inspect / teen_inspect). */
  beginInspect(duration = 0.45): void {
    this.inspecting = true;
    this.inspectTimer = duration;
    this.vx = 0;
    this.setAnim(this.era === 'teen' ? 'teen_inspect' : 'adult_inspect');
  }

  /**
   * Apply horizontal movement from input axis (−1 / 0 / +1).
   * Clamps to [minX, maxX]. No-op while inspecting / combat-locked.
   */
  applyWalk(axis: number, dt: number, minX: number, maxX: number): void {
    if (this.inspecting || this.combatLock === 'punch' || this.combatLock === 'kick' || this.combatLock === 'bazar' || this.combatLock === 'hurt' || this.combatLock === 'ko') {
      if (this.combatLock === 'none') this.vx = 0;
      return;
    }
    this.vx = axis * this.walkSpeed;
    if (axis !== 0) this.facing = axis > 0 ? 1 : -1;
    this.x += this.vx * dt;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;

    if (!this.grounded) {
      this.setAnim(this.era === 'teen' ? (this.vy < 0 ? 'teen_jump' : 'teen_fall') : this.vy < 0 ? 'adult_jump' : 'adult_fall');
      return;
    }

    if (axis !== 0) {
      if (this.era === 'teen' && this.walkSpeed >= 58) {
        this.setAnim('teen_run');
      } else {
        this.setAnim(this.era === 'teen' ? 'teen_walk' : 'adult_walk');
      }
    } else {
      this.setAnim(this.era === 'teen' ? 'teen_idle' : 'adult_idle');
    }
  }

  tryJump(): boolean {
    if (!this.grounded || this.isCombatLocked) return false;
    this.vy = this.jumpVel;
    this.grounded = false;
    this.setAnim(this.era === 'teen' ? 'teen_jump' : 'adult_jump');
    return true;
  }

  tryPunch(): boolean {
    if (this.era !== 'teen' || this.isCombatLocked || !this.grounded) return false;
    this.combatLock = 'punch';
    this.combatTimer = 0.34;
    this.attackHitDone = false;
    this.vx = 0;
    this.setAnim('teen_punch');
    return true;
  }

  tryKick(): boolean {
    if (this.era !== 'teen' || this.isCombatLocked || !this.grounded) return false;
    this.combatLock = 'kick';
    this.combatTimer = 0.38;
    this.attackHitDone = false;
    this.vx = 0;
    this.setAnim('teen_kick');
    return true;
  }

  /** Spend swagger to shout — returns bubble or null. Triggers scene shake. */
  tryBazar(): BazarBubble | null {
    if (this.era !== 'teen' || this.isCombatLocked) return null;
    if (this.streetSwagger < BAZAR_COST) return null;
    this.streetSwagger -= BAZAR_COST;
    this.combatLock = 'bazar';
    this.combatTimer = 0.42;
    this.vx = 0;
    this.bazarShake = 0.28;
    this.setAnim('teen_bazar_shout');
    return new BazarBubble({
      x: this.x + this.facing * 22,
      y: this.y - this.height + 12,
      facing: this.facing,
    });
  }

  addSwagger(amount: number): void {
    this.streetSwagger = Math.min(MAX_SWAGGER, this.streetSwagger + amount);
  }

  /** Active melee hitbox during punch/kick active frames (scaled for 28–32px sprites). */
  attackHitbox(): Rect | null {
    if (this.attackHitDone) return null;
    if (this.combatLock === 'punch' && this.combatTimer <= 0.26) {
      return {
        x: this.facing > 0 ? this.x + 4 : this.x - 28,
        y: this.y - 28,
        w: 24,
        h: 14,
      };
    }
    if (this.combatLock === 'kick' && this.combatTimer <= 0.28) {
      return {
        x: this.facing > 0 ? this.x + 6 : this.x - 32,
        y: this.y - 20,
        w: 28,
        h: 14,
      };
    }
    return null;
  }

  markAttackConnected(): void {
    this.attackHitDone = true;
  }

  body(): Rect {
    return bodyRect(this.x, this.y, this.width - 2, this.height - 2);
  }

  takeDamage(amount: number, knockFacing: 1 | -1): void {
    if (this.invuln > 0 || this.combatLock === 'ko') return;
    this.mentalFortitude = Math.max(0, this.mentalFortitude - amount);
    this.syncHp();
    this.vx = knockFacing * 70;
    this.invuln = 0.55;
    this.combatLock = 'hurt';
    this.combatTimer = 0.32;
    this.setAnim(this.era === 'teen' ? 'teen_hurt' : 'adult_hurt');
    if (this.mentalFortitude <= 0) {
      this.combatLock = 'ko';
      this.combatTimer = 1.2;
      this.setAnim(this.era === 'teen' ? 'teen_ko' : 'adult_ko');
    }
  }

  /**
   * Integrate jump gravity; call after applyWalk each frame in combat scenes.
   * Optional solid platforms (feet land on top when falling through their top).
   */
  applyPhysics(
    dt: number,
    minX: number,
    maxX: number,
    platforms?: readonly { x: number; y: number; w: number }[],
  ): void {
    const prevY = this.y;

    if (!this.grounded || this.vy !== 0) {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;

      let landed = false;
      let landY = this.floorY;

      if (platforms && platforms.length > 0 && this.vy >= 0) {
        for (const p of platforms) {
          if (this.x < p.x || this.x > p.x + p.w) continue;
          // Crossed / resting on platform top this frame
          if (prevY <= p.y + 2 && this.y >= p.y) {
            if (!landed || p.y < landY) {
              landY = p.y;
              landed = true;
            }
          }
        }
      }

      if (!landed && this.y >= this.floorY) {
        landY = this.floorY;
        landed = true;
      }

      if (landed) {
        this.y = landY;
        this.vy = 0;
        this.grounded = true;
        this.floorY = landY;
      } else {
        this.grounded = false;
      }
    } else if (platforms && platforms.length > 0) {
      // Walk off edges — drop if no platform under feet
      let support = false;
      let supportY = this.floorY;
      for (const p of platforms) {
        if (this.x < p.x || this.x > p.x + p.w) continue;
        if (Math.abs(this.y - p.y) <= 3) {
          support = true;
          supportY = p.y;
          break;
        }
      }
      if (support) {
        this.y = supportY;
        this.floorY = supportY;
      } else {
        this.grounded = false;
        this.vy = 20;
      }
    } else {
      this.y = this.floorY;
    }

    // Knockback slide
    if (this.combatLock === 'hurt' || this.combatLock === 'ko') {
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.04, dt);
    }

    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
  }

  update(dt: number): void {
    this.animTime += dt;
    if (this.bazarShake > 0) this.bazarShake = Math.max(0, this.bazarShake - dt);
    if (this.invuln > 0) this.invuln -= dt;

    if (this.inspecting) {
      this.inspectTimer -= dt;
      if (this.inspectTimer <= 0) {
        this.inspecting = false;
        this.setAnim(this.era === 'teen' ? 'teen_idle' : 'adult_idle');
      }
    }

    if (this.combatLock !== 'none') {
      this.combatTimer -= dt;
      if (this.combatTimer <= 0) {
        if (this.combatLock === 'ko') {
          // Stay KO until scene handles Game Over
          this.combatTimer = 0;
        } else {
          this.combatLock = 'none';
          this.attackHitDone = false;
          this.setAnim(this.era === 'teen' ? 'teen_idle' : 'adult_idle');
        }
      }
    }
  }

  /** Draw multi-tile Genesis sprite for the active clip frame. */
  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    preloadFamilyFaces();
    const map = this.animMap as Record<string, AnimClip>;
    const clip = map[this.animState];
    const frameIndex =
      clip && clip.frames.length > 0
        ? Math.floor(this.animTime * clip.fps) % clip.frames.length
        : 0;

    const kind = this.resolveSpriteKind();
    const flash = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    if (flash) return;
    drawPlayerSprite(ctx, kind, frameIndex, this.x, this.y, this.facing);
    // Photo-quality face from family portrait (son = Зуич)
    const teen = this.era === 'teen';
    const fw = teen ? 10 : 11;
    const fh = teen ? 12 : 13;
    const fy = this.y - (teen ? 38 : 42);
    drawFamilyFaceWithRim(ctx, 'hero', this.x - fw / 2, fy, fw, fh);
  }

  private resolveSpriteKind(): PlayerSpriteKind {
    const s = this.animState;
    if (s === 'adult_inspect') return 'adult_inspect';
    if (s === 'adult_walk' || s === 'adult_run') return 'adult_walk';
    if (s.startsWith('adult_')) return 'adult_idle';
    if (s === 'teen_inspect') return 'teen_inspect';
    if (s === 'teen_run') return 'teen_run';
    if (s === 'teen_walk') return 'teen_walk';
    if (s === 'teen_punch') return 'teen_punch';
    if (s === 'teen_kick') return 'teen_kick';
    if (s === 'teen_bazar_shout') return 'teen_bazar';
    if (s === 'teen_jump' || s === 'teen_fall') return 'teen_jump';
    if (s === 'teen_hurt' || s === 'teen_ko') return 'teen_hurt';
    return 'teen_idle';
  }
}
