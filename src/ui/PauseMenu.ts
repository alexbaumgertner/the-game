/**
 * Pause overlay — root menu + settings. Keyboard + canvas hit-test + touch labels.
 * Simulation stays frozen via GameLoop.pause(); this layer still paints each frame.
 */

import { drawUiText, drawUiTextCentered, uiPanel } from '@/art/uiFont';
import { SEGA } from '@/art/segaPalette';
import {
  getSettings,
  writeSettings,
  type DialogSpeed,
  type DialogTextSize,
  type GameSettings,
} from '@/core/Settings';
import { audio } from '@/audio';

export type PausePage = 'root' | 'settings';

export type PauseAction =
  | { type: 'resume' }
  | { type: 'exitApartment' }
  | { type: 'muteToggled' }
  | { type: 'none' };

function dialogSizeLabel(v: DialogTextSize): string {
  return v === 'large' ? 'Крупный' : 'Обычный';
}

function dialogSpeedLabel(v: DialogSpeed): string {
  if (v === 'slow') return 'Медленно';
  if (v === 'fast') return 'Быстро';
  return 'Обычно';
}

function cycleTextSize(v: DialogTextSize): DialogTextSize {
  return v === 'normal' ? 'large' : 'normal';
}

function cycleSpeed(v: DialogSpeed): DialogSpeed {
  if (v === 'slow') return 'normal';
  if (v === 'normal') return 'fast';
  return 'slow';
}

export class PauseMenu {
  private open = false;
  private page: PausePage = 'root';
  private cursor = 0;

  get isOpen(): boolean {
    return this.open;
  }

  get currentPage(): PausePage {
    return this.page;
  }

  /** Open the root menu (called when the game pauses). */
  show(): void {
    this.open = true;
    this.page = 'root';
    this.cursor = 0;
  }

  /** Hide without resuming — caller resumes the loop. */
  hide(): void {
    this.open = false;
    this.page = 'root';
    this.cursor = 0;
  }

  /** Labels for TouchControls strip while open. */
  touchLabels(): string[] {
    if (!this.open) return [];
    if (this.page === 'root') return this.rootLabels();
    return this.settingsLabels().map((l) => l.replace(/^[^:]+:\s*/, '').slice(0, 22));
  }

  /** Full settings row labels (for canvas + keyboard). */
  private settingsLabels(): string[] {
    const s = getSettings();
    return [
      `Меньше эффектов: ${s.reducedEffects ? 'Вкл' : 'Выкл'}`,
      `Текст диалога: ${dialogSizeLabel(s.dialogTextSize)}`,
      `Скорость диалога: ${dialogSpeedLabel(s.dialogSpeed)}`,
      'Назад',
    ];
  }

  private rootLabels(): string[] {
    const muteLabel = audio.isMuted ? 'Звук: выкл (M)' : 'Звук: вкл (M)';
    return ['Продолжить', 'Выйти в квартиру', muteLabel, 'Настройки'];
  }

  private items(): string[] {
    return this.page === 'root' ? this.rootLabels() : this.settingsLabels();
  }

  move(delta: number): void {
    if (!this.open) return;
    const n = this.items().length;
    this.cursor = (this.cursor + delta + n * 8) % n;
  }

  /**
   * Confirm current row. Returns an action the host should apply
   * (resume / exit apartment). Settings mutations happen in-place.
   */
  confirm(): PauseAction {
    if (!this.open) return { type: 'none' };

    if (this.page === 'root') {
      if (this.cursor === 0) return { type: 'resume' };
      if (this.cursor === 1) return { type: 'exitApartment' };
      if (this.cursor === 2) {
        audio.toggleMute();
        return { type: 'muteToggled' };
      }
      this.page = 'settings';
      this.cursor = 0;
      return { type: 'none' };
    }

    const s = getSettings();
    if (this.cursor === 0) {
      writeSettings({ reducedEffects: !s.reducedEffects });
    } else if (this.cursor === 1) {
      writeSettings({ dialogTextSize: cycleTextSize(s.dialogTextSize) });
    } else if (this.cursor === 2) {
      writeSettings({ dialogSpeed: cycleSpeed(s.dialogSpeed) });
    } else {
      this.page = 'root';
      this.cursor = 3;
    }
    return { type: 'none' };
  }

  /** Esc / back: settings → root; root → resume. */
  back(): PauseAction {
    if (!this.open) return { type: 'none' };
    if (this.page === 'settings') {
      this.page = 'root';
      this.cursor = 3;
      return { type: 'none' };
    }
    return { type: 'resume' };
  }

  selectIndex(index: number): PauseAction {
    if (!this.open) return { type: 'none' };
    const n = this.items().length;
    if (index < 0 || index >= n) return { type: 'none' };
    this.cursor = index;
    return this.confirm();
  }

  /**
   * Hit-test canvas logical coords against menu rows.
   * Returns row index or null.
   */
  hitTest(x: number, y: number, canvasWidth: number, canvasHeight: number): number | null {
    if (!this.open) return null;
    const layout = this.layout(canvasWidth, canvasHeight);
    if (x < layout.x || x > layout.x + layout.w) return null;
    for (let i = 0; i < layout.rows.length; i++) {
      const row = layout.rows[i]!;
      if (y >= row.y && y <= row.y + row.h) return i;
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.open) return;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 14, 0.78)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const layout = this.layout(canvasWidth, canvasHeight);
    uiPanel(
      ctx,
      layout.x,
      layout.panelY,
      layout.w,
      layout.panelH,
      'rgba(12,14,20,0.94)',
      'rgba(200,168,80,0.85)',
    );

    const title = this.page === 'root' ? 'ПАУЗА' : 'НАСТРОЙКИ';
    drawUiTextCentered(ctx, title, canvasWidth / 2, layout.panelY + 8, SEGA.white, 11, 700);

    const items = this.items();
    for (let i = 0; i < items.length; i++) {
      const row = layout.rows[i]!;
      const selected = i === this.cursor;
      const label = `${selected ? '▶ ' : '  '}${items[i]}`;
      const color = selected ? '#f0e8c8' : '#a8a090';
      drawUiText(ctx, label, layout.x + 12, row.y + 3, color, 7.5, selected ? 700 : 550);
    }

    drawUiTextCentered(
      ctx,
      'W/S · Enter · Esc',
      canvasWidth / 2,
      layout.panelY + layout.panelH - 12,
      '#706858',
      5.5,
      500,
    );
    ctx.restore();
  }

  /** Debug / tests. */
  snapshot(): { open: boolean; page: PausePage; cursor: number; settings: GameSettings } {
    return {
      open: this.open,
      page: this.page,
      cursor: this.cursor,
      settings: getSettings(),
    };
  }

  private layout(canvasWidth: number, canvasHeight: number): {
    x: number;
    w: number;
    panelY: number;
    panelH: number;
    rows: { y: number; h: number }[];
  } {
    const items = this.items();
    const rowH = 16;
    const topPad = 28;
    const bottomPad = 18;
    const panelH = topPad + items.length * rowH + bottomPad;
    const w = Math.min(220, canvasWidth - 24);
    const x = Math.round((canvasWidth - w) / 2);
    const panelY = Math.round((canvasHeight - panelH) / 2);
    const rows = items.map((_, i) => ({
      y: panelY + topPad + i * rowH,
      h: rowH,
    }));
    return { x, w, panelY, panelH, rows };
  }
}
