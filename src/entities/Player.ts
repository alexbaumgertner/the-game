/**
 * Player entity — dual-era animation map (teen_* childhood / adult_* present).
 *
 * TODO Phase 3:
 * - Physics: walk, run, jump, crouch on platform tiles
 * - Combat: punch, kick, grab; hitbox frames per anim
 * - Bazar (market) interactions & item pickup
 * - Switch era → swap animation map + stats
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

  private animTime = 0;

  constructor(config: PlayerConfig = {}) {
    this.x = config.x ?? 40;
    this.y = config.y ?? 120;
    this.era = config.era ?? 'adult';
    this.animState = this.era === 'teen' ? 'teen_idle' : 'adult_idle';
  }

  get animMap(): TeenAnimMap | AdultAnimMap {
    return this.era === 'teen' ? TEEN_ANIM_MAP : ADULT_ANIM_MAP;
  }

  setEra(era: PlayerEra): void {
    this.era = era;
    this.animState = era === 'teen' ? 'teen_idle' : 'adult_idle';
    this.animTime = 0;
  }

  setAnim(state: PlayerAnimState): void {
    if (this.animState === state) return;
    this.animState = state;
    this.animTime = 0;
  }

  /** Advance animation clock. Physics/input land in Phase 3. */
  update(dt: number): void {
    this.animTime += dt;
    // TODO: integrate input, platform collision, combat
  }

  /** Draw a geometric placeholder for the active clip frame. */
  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    const map = this.animMap as Record<string, AnimClip>;
    const clip = map[this.animState];
    const frameIndex =
      clip && clip.frames.length > 0
        ? Math.floor(this.animTime * clip.fps) % clip.frames.length
        : 0;

    const w = this.era === 'teen' ? 10 : 12;
    const h = this.era === 'teen' ? 16 : 20;
    const color = this.era === 'teen' ? '#6ec6ff' : '#e8c56a';

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h, w, h);
    // Tiny face marker so facing reads clearly
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(2, -h + 4, 2, 2);
    // Debug frame label (dev scaffold only)
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '4px monospace';
    ctx.fillText(String(frameIndex), -w / 2, -h - 2);
    ctx.restore();
  }
}
