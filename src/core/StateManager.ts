/**
 * StateManager — two-era scene machine for Novgorod 1995.
 *
 * Eras: ERA_2026 (framing apartment) · ERA_1995 (childhood rynok)
 * Scene swaps cross-fade through black; enter/exit hooks fire at the swap point.
 */

import type { Input } from './Input';

/** High-level narrative eras. */
export type GameEra = 'ERA_2026' | 'ERA_1995';

/** Named gameplay / UI scenes. */
export type SceneId = 'apartment_2026' | 'rynok_1995';

export interface SceneContext {
  era: GameEra;
  scene: SceneId;
  /** Opaque payload for the active scene (level index, dialogue id, …). */
  data?: Record<string, unknown>;
}

export interface SceneHandlers {
  enter?(ctx: SceneContext): void;
  exit?(ctx: SceneContext): void;
  update?(dt: number, ctx: SceneContext): void;
  render?(
    ctx2d: CanvasRenderingContext2D,
    alpha: number,
    ctx: SceneContext,
    width: number,
    height: number,
  ): void;
}

export interface GotoOptions {
  era?: GameEra;
  data?: Record<string, unknown>;
  /** Fade duration in seconds (each half). Default 0.45. Set 0 to skip fade. */
  fadeSeconds?: number;
}

type FadePhase = 'idle' | 'out' | 'in';

export interface ProgressFlags {
  hasKey: boolean;
  seenPhoto: boolean;
  diaryUnlocked: boolean;
  level1Selected: boolean;
}

const DEFAULT_FLAGS: ProgressFlags = {
  hasKey: false,
  seenPhoto: false,
  diaryUnlocked: false,
  level1Selected: false,
};

export class StateManager {
  private era: GameEra = 'ERA_2026';
  private scene: SceneId = 'apartment_2026';
  private data: Record<string, unknown> | undefined;
  private readonly handlers = new Map<SceneId, SceneHandlers>();

  private fadePhase: FadePhase = 'idle';
  private fadeT = 0;
  private fadeDuration = 0.45;
  private pending: { scene: SceneId; options?: GotoOptions } | null = null;

  /** Shared progress flags (apartment puzzles → level unlock). */
  readonly flags: ProgressFlags = { ...DEFAULT_FLAGS };

  /** Optional shared input — scenes read this; disabled during fades. */
  input: Input | null = null;

  get current(): SceneContext {
    return { era: this.era, scene: this.scene, data: this.data };
  }

  get isTransitioning(): boolean {
    return this.fadePhase !== 'idle';
  }

  /** 0 = fully visible, 1 = fully black. */
  get fadeAlpha(): number {
    if (this.fadePhase === 'out') return this.fadeT;
    if (this.fadePhase === 'in') return 1 - this.fadeT;
    return 0;
  }

  register(scene: SceneId, handlers: SceneHandlers): void {
    this.handlers.set(scene, handlers);
  }

  setFlag<K extends keyof ProgressFlags>(key: K, value: ProgressFlags[K]): void {
    this.flags[key] = value;
  }

  /**
   * Transition to a new scene (and optionally era) with fade-to-black.
   * If already fading, queues the latest request.
   */
  goto(scene: SceneId, options?: GotoOptions): void {
    const fadeSeconds = options?.fadeSeconds;
    const duration = fadeSeconds === undefined ? 0.45 : Math.max(0, fadeSeconds);

    if (duration === 0) {
      this.applySwap(scene, options);
      return;
    }

    if (this.fadePhase !== 'idle') {
      this.pending = { scene, options };
      return;
    }

    this.fadeDuration = duration;
    this.fadePhase = 'out';
    this.fadeT = 0;
    this.pending = { scene, options };
    this.input?.setEnabled(false);
  }

  /** Immediate boot into a scene without fade (first frame). */
  boot(scene: SceneId, options?: GotoOptions): void {
    this.applySwap(scene, options);
  }

  update(dt: number): void {
    if (this.fadePhase === 'out') {
      this.fadeT = Math.min(1, this.fadeT + dt / this.fadeDuration);
      if (this.fadeT >= 1 && this.pending) {
        this.applySwap(this.pending.scene, this.pending.options);
        this.pending = null;
        this.fadePhase = 'in';
        this.fadeT = 0;
      }
      this.input?.endFrame();
      return;
    }

    if (this.fadePhase === 'in') {
      this.fadeT = Math.min(1, this.fadeT + dt / this.fadeDuration);
      if (this.fadeT >= 1) {
        this.fadePhase = 'idle';
        this.fadeT = 0;
        this.input?.setEnabled(true);
        if (this.pending) {
          const next = this.pending;
          this.pending = null;
          this.goto(next.scene, next.options);
          this.input?.endFrame();
          return;
        }
      }
      // Keep updating the new scene during fade-in so it settles.
    }

    this.handlers.get(this.scene)?.update?.(dt, this.current);
    this.input?.endFrame();
  }

  render(
    ctx2d: CanvasRenderingContext2D,
    alpha: number,
    width: number,
    height: number,
  ): void {
    this.handlers.get(this.scene)?.render?.(ctx2d, alpha, this.current, width, height);
  }

  /** Draw fade overlay after HUD so chrome does not float on top of black. */
  renderFade(ctx2d: CanvasRenderingContext2D, width: number, height: number): void {
    const a = this.fadeAlpha;
    if (a > 0) {
      ctx2d.fillStyle = `rgba(0, 0, 0, ${a.toFixed(3)})`;
      ctx2d.fillRect(0, 0, width, height);
    }
  }

  private applySwap(scene: SceneId, options?: GotoOptions): void {
    const prev = this.current;
    this.handlers.get(prev.scene)?.exit?.(prev);

    if (options?.era !== undefined) this.era = options.era;
    this.scene = scene;
    this.data = options?.data;

    const next = this.current;
    this.handlers.get(scene)?.enter?.(next);
  }
}
