/**
 * Fixed-timestep game loop with variable render interpolation.
 *
 * Update runs at a constant step (default 60 Hz). Render uses the leftover
 * accumulator fraction so motion stays smooth when the display refresh rate
 * differs from the simulation rate. Pause freezes simulation time without
 * tearing down the rAF handle (optional — stop() fully halts).
 */

export type UpdateFn = (dt: number) => void;
export type RenderFn = (alpha: number) => void;

export interface GameLoopOptions {
  /** Fixed simulation step in seconds. Default: 1/60. */
  fixedDt?: number;
  /**
   * Max seconds of simulation catch-up per frame.
   * Prevents spiral-of-death after long tab suspension. Default: 0.25.
   */
  maxFrameTime?: number;
  /** Called every fixed step with `fixedDt`. */
  update: UpdateFn;
  /**
   * Called once per animation frame after updates.
   * `alpha` is leftover accumulator / fixedDt in [0, 1) for interpolation.
   */
  render: RenderFn;
}

export class GameLoop {
  private readonly fixedDt: number;
  private readonly maxFrameTime: number;
  private readonly update: UpdateFn;
  private readonly render: RenderFn;

  private accumulator = 0;
  private lastTime = 0;
  private rafId: number | null = null;
  private running = false;
  private paused = false;

  constructor(options: GameLoopOptions) {
    this.fixedDt = options.fixedDt ?? 1 / 60;
    this.maxFrameTime = options.maxFrameTime ?? 0.25;
    this.update = options.update;
    this.render = options.render;
  }

  /** Whether the loop is currently scheduled via requestAnimationFrame. */
  get isRunning(): boolean {
    return this.running;
  }

  /** Whether simulation updates are skipped (render still paints). */
  get isPaused(): boolean {
    return this.paused;
  }

  /** Fixed simulation timestep in seconds. */
  get step(): number {
    return this.fixedDt;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.paused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    // Drop leftover so we don't dump a backlog of updates on resume.
    this.accumulator = 0;
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  /** Toggle pause/resume. No-op if the loop is stopped. */
  togglePause(): void {
    if (!this.running) return;
    if (this.paused) this.resume();
    else this.pause();
  }

  private readonly tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);

    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp runaway frames (tab backgrounded, debugger pause, etc.).
    if (frameTime > this.maxFrameTime) {
      frameTime = this.maxFrameTime;
    }

    if (!this.paused) {
      this.accumulator += frameTime;

      while (this.accumulator >= this.fixedDt) {
        this.update(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }
    }

    const alpha = this.paused ? 0 : this.accumulator / this.fixedDt;
    this.render(alpha);
  };
}
