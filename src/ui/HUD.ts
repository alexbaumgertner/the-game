/**
 * HUD — health, era badge, objective ticker.
 *
 * TODO Phase 6:
 * - Heart / bar HP for player
 * - Combo meter & score
 * - Minimap for rynok (Level 1)
 * - Pause overlay hooks
 */

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  eraLabel: string;
  objective?: string;
  paused?: boolean;
}

export class HUD {
  private snapshot: HudSnapshot = {
    hp: 100,
    maxHp: 100,
    eraLabel: 'ADULT',
  };

  set(partial: Partial<HudSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
  }

  update(_dt: number): void {
    // TODO: animate HP bar drain, flash on hit
  }

  render(ctx: CanvasRenderingContext2D, _canvasWidth: number, _canvasHeight: number): void {
    const { hp, maxHp, eraLabel, objective, paused } = this.snapshot;

    ctx.save();
    ctx.font = '6px monospace';
    ctx.fillStyle = '#e8e4d8';
    ctx.fillText(`HP ${Math.round(hp)}/${maxHp}`, 4, 10);
    ctx.fillText(eraLabel, 4, 18);
    if (objective) {
      ctx.fillStyle = '#6ec6ff';
      ctx.fillText(objective, 4, 26);
    }
    if (paused) {
      ctx.fillStyle = 'rgba(10, 10, 12, 0.55)';
      ctx.fillRect(0, 0, _canvasWidth, _canvasHeight);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '10px monospace';
      ctx.fillText('PAUSED', _canvasWidth / 2 - 18, _canvasHeight / 2);
    }
    ctx.restore();
  }
}
