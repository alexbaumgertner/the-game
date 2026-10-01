/**
 * Player entity — dual-era animation map (teen_* childhood / adult_* present).
 *
 * Phase 2: walk + inspect for apartment framing; teen presentation in 1995 stub.
 * Phase 3+: platform physics, combat frames, Bazar interact.
 */

/** Childhood (1990s flashback) sprite states. */
export type TeenAnimState =
  | 'teen_idle'
  | 'teen_walk'
  | 'teen_run'
  | 'teen_jump'
  | 'teen_fall'
  | 'teen_crouch'
  | 'teen_punch'
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

/** Placeholder clips — procedural rects until real sprites land. */
export const TEEN_ANIM_MAP: TeenAnimMap = {
  teen_idle: { frames: ['teen_idle_0'], fps: 4, loop: true },
  teen_walk: { frames: ['teen_walk_0', 'teen_walk_1'], fps: 8, loop: true },
  teen_run: { frames: ['teen_run_0', 'teen_run_1', 'teen_run_2'], fps: 12, loop: true },
  teen_jump: { frames: ['teen_jump_0'], fps: 1, loop: false },
  teen_fall: { frames: ['teen_fall_0'], fps: 1, loop: false },
  teen_crouch: { frames: ['teen_crouch_0'], fps: 1, loop: false },
  teen_punch: { frames: ['teen_punch_0', 'teen_punch_1'], fps: 10, loop: false },
  teen_inspect: { frames: ['teen_inspect_0'], fps: 1, loop: false },
  teen_hurt: { frames: ['teen_hurt_0'], fps: 1, loop: false },
  teen_ko: { frames: ['teen_ko_0'], fps: 1, loop: false },
};

export const ADULT_ANIM_MAP: AdultAnimMap = {
  adult_idle: { frames: ['adult_idle_0'], fps: 4, loop: true },
  adult_walk: { frames: ['adult_walk_0', 'adult_walk_1'], fps: 8, loop: true },
  adult_run: { frames: ['adult_run_0', 'adult_run_1', 'adult_run_2'], fps: 12, loop: true },
  adult_jump: { frames: ['adult_jump_0'], fps: 1, loop: false },
  adult_fall: { frames: ['adult_fall_0'], fps: 1, loop: false },
  adult_crouch: { frames: ['adult_crouch_0'], fps: 1, loop: false },
  adult_punch: { frames: ['adult_punch_0', 'adult_punch_1'], fps: 10, loop: false },
  adult_kick: { frames: ['adult_kick_0', 'adult_kick_1'], fps: 10, loop: false },
  adult_inspect: { frames: ['adult_inspect_0'], fps: 1, loop: false },
  adult_hurt: { frames: ['adult_hurt_0'], fps: 1, loop: false },
  adult_ko: { frames: ['adult_ko_0'], fps: 1, loop: false },
};

export interface PlayerConfig {
  x?: number;
  y?: number;
  era?: PlayerEra;
}

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  era: PlayerEra;
  animState: PlayerAnimState;
  facing: 1 | -1 = 1;
  hp = 100;
  /** Horizontal walk speed (px/s). */
  walkSpeed = 55;
  /** True while an inspect pose is locked (blocks movement). */
  inspecting = false;

  private animTime = 0;
  private inspectTimer = 0;

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
    return this.era === 'teen' ? 10 : 12;
  }

  get height(): number {
    return this.era === 'teen' ? 16 : 20;
  }

  setEra(era: PlayerEra): void {
    this.era = era;
    this.animState = era === 'teen' ? 'teen_idle' : 'adult_idle';
    this.animTime = 0;
    this.inspecting = false;
    this.inspectTimer = 0;
  }

  setAnim(state: PlayerAnimState): void {
    if (this.animState === state) return;
    this.animState = state;
    this.animTime = 0;
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
   * Clamps to [minX, maxX]. No-op while inspecting.
   */
  applyWalk(axis: number, dt: number, minX: number, maxX: number): void {
    if (this.inspecting) {
      this.vx = 0;
      return;
    }
    this.vx = axis * this.walkSpeed;
    if (axis !== 0) this.facing = axis > 0 ? 1 : -1;
    this.x += this.vx * dt;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;

    if (axis !== 0) {
      this.setAnim(this.era === 'teen' ? 'teen_walk' : 'adult_walk');
    } else {
      this.setAnim(this.era === 'teen' ? 'teen_idle' : 'adult_idle');
    }
  }

  update(dt: number): void {
    this.animTime += dt;
    if (this.inspecting) {
      this.inspectTimer -= dt;
      if (this.inspectTimer <= 0) {
        this.inspecting = false;
        this.setAnim(this.era === 'teen' ? 'teen_idle' : 'adult_idle');
      }
    }
  }

  /** Draw a geometric placeholder for the active clip frame. */
  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    const map = this.animMap as Record<string, AnimClip>;
    const clip = map[this.animState];
    const frameIndex =
      clip && clip.frames.length > 0
        ? Math.floor(this.animTime * clip.fps) % clip.frames.length
        : 0;

    const w = this.width;
    const h = this.height;
    const color = this.era === 'teen' ? '#6ec6ff' : '#e8c56a';
    const bob =
      this.animState.includes('walk') && frameIndex === 1 ? -1 : 0;
    const lean = this.animState.includes('inspect') ? 2 : 0;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y + bob));
    ctx.scale(this.facing, 1);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2 + lean, -h, w, h);
    // Head accent
    ctx.fillStyle = this.era === 'teen' ? '#f0d8a8' : '#d4b896';
    ctx.fillRect(-w / 2 + lean + 1, -h, w - 2, 5);
    // Face marker
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(2 + lean, -h + 2, 2, 2);
    // Inspect arm reach
    if (this.animState.includes('inspect')) {
      ctx.fillStyle = color;
      ctx.fillRect(w / 2 - 1, -h + 8, 5, 2);
    }
    ctx.restore();
  }
}
