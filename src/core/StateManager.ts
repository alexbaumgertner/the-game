/**
 * StateManager — era / scene stack for Novgorod 1995.
 *
 * TODO Phase 2:
 * - Define eras: Intro → Childhood (teen_*) → Adult (adult_*) → Epilogue
 * - Push/pop scene stack with enter/exit hooks
 * - Persist lightweight progress (level cleared, dialogue flags)
 * - Bridge to DialogueSystem for cutscene ownership
 */

/** High-level narrative eras the player moves through. */
export type GameEra =
  | 'boot'
  | 'title'
  | 'intro'
  | 'childhood'
  | 'adult'
  | 'epilogue'
  | 'paused';

/** A named gameplay / UI scene within an era. */
export type SceneId =
  | 'boot'
  | 'title'
  | 'cutscene'
  | 'level'
  | 'dialogue'
  | 'game_over'
  | 'victory';

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
  render?(alpha: number, ctx: SceneContext): void;
}

/**
 * Stub StateManager. Holds current era/scene and a handler registry.
 * Full transitions land in Phase 2.
 */
export class StateManager {
  private era: GameEra = 'boot';
  private scene: SceneId = 'boot';
  private data: Record<string, unknown> | undefined;
  private readonly handlers = new Map<SceneId, SceneHandlers>();

  get current(): SceneContext {
    return { era: this.era, scene: this.scene, data: this.data };
  }

  /** Register update/render hooks for a scene id. */
  register(scene: SceneId, handlers: SceneHandlers): void {
    this.handlers.set(scene, handlers);
  }

  /**
   * Transition to a new scene (and optionally era).
   * TODO: animate transitions, block input during cutscenes.
   */
  goto(scene: SceneId, options?: { era?: GameEra; data?: Record<string, unknown> }): void {
    const prev = this.current;
    const prevHandlers = this.handlers.get(prev.scene);
    prevHandlers?.exit?.(prev);

    if (options?.era !== undefined) this.era = options.era;
    this.scene = scene;
    this.data = options?.data;

    const next = this.current;
    this.handlers.get(scene)?.enter?.(next);
  }

  update(dt: number): void {
    this.handlers.get(this.scene)?.update?.(dt, this.current);
  }

  render(alpha: number): void {
    this.handlers.get(this.scene)?.render?.(alpha, this.current);
  }
}
