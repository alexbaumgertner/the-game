/**
 * ERA_2026 — Level 12 «Финал».
 * Night questions → diary montage → help newcomer → credits.
 * Calm; no combat/timers. Pause/exit always.
 */

import type { SceneContext, StateManager } from '@/core/StateManager';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { DialogueSystem } from '@/systems/DialogueSystem';
import { APT_PAL } from '@/art/segaPalette';
import { px, segaBox } from '@/art/pixelDraw';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import {
  FINALE_CLOSING,
  FINALE_CREDITS,
  FINALE_MONTAGE,
  FINALE_QUESTIONS,
  NEWCOMER_LINES,
} from '@/data/finale';
import { LEVELS } from '@/data/levels';

const FLOOR_Y = 188;
const P = APT_PAL;

type Phase = 'night' | 'montage' | 'help' | 'credits' | 'done';

export interface FinaleSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  tea: TeaSystem;
}

export function createFinale2026Scene(deps: FinaleSceneDeps) {
  const { states, player, hud, tea } = deps;
  const dialogue = new DialogueSystem();

  let phase: Phase = 'night';
  let qIndex = 0;
  let thoughtTimer = 0;
  let thought: string | null = null;
  let dawn = 0; // 0 night → 1 dawn
  let montageIndex = 0;
  let montageTimer = 0;
  let helpCursor = 0;
  let stayed = false;
  let creditIndex = 0;
  let creditTimer = 0;
  let toast = '';
  let toastTimer = 0;

  const helpChoices = [
    { id: 'listen', label: 'Слушать' },
    { id: 'advise', label: 'Слабый совет' },
    { id: 'ask', label: 'Спросить / поделиться' },
    { id: 'pour', label: 'Налить ПИВО' },
  ] as const;

  const showToast = (m: string, s = 1.8): void => {
    toast = m;
    toastTimer = s;
  };

  const syncHud = (): void => {
    hud.set({
      hp: player.hp,
      maxHp: MAX_FORTITUDE,
      fortitude: player.mentalFortitude,
      maxFortitude: MAX_FORTITUDE,
      swagger: 0,
      showSwagger: false,
      eraLabel: 'ЗУИЧ · сейчас',
      levelTitle: 'Финал',
      objective:
        phase === 'night'
          ? 'Ночь вопросов'
          : phase === 'montage'
            ? 'Путь · Enter пропуск'
            : phase === 'help'
              ? 'Новичок'
              : phase === 'credits'
                ? 'Титры'
                : 'УР. 12 ПРОЙДЕН',
    });
  };

  const unlockReplay = (): void => {
    for (const lvl of LEVELS) {
      states.setFlag(`level${lvl.id}Cleared` as keyof typeof states.flags, true);
    }
    states.setFlag('level12Cleared', true);
  };

  const returnHome = (): void => {
    unlockReplay();
    tea.thirst = 120;
    tea.enabled = true;
    states.goto('apartment_2026', {
      era: 'ERA_2026',
      fadeSeconds: 0.5,
      data: { afterFinale: true },
    });
  };

  const pushThought = (): void => {
    if (qIndex >= FINALE_QUESTIONS.length) {
      phase = 'montage';
      montageIndex = 0;
      montageTimer = 2.2;
      dawn = 1;
      syncHud();
      return;
    }
    thought = FINALE_QUESTIONS[qIndex]!;
    thoughtTimer = 2.8;
    qIndex += 1;
    dawn = Math.min(1, qIndex / FINALE_QUESTIONS.length);
  };

  return {
    enter(): void {
      tea.enabled = true;
      tea.thirst = 35; // start dim; thoughts restore via dawn
      tea.showLongHint = false;
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.setFloorY(FLOOR_Y);
      player.x = 140;
      player.y = FLOOR_Y;
      phase = 'night';
      qIndex = 0;
      dawn = 0;
      montageIndex = 0;
      helpCursor = 0;
      stayed = false;
      creditIndex = 0;
      thought = null;
      toast = '';
      toastTimer = 0;
      syncHud();
      pushThought();
    },

    exit(): void {
      dialogue.resetSilent();
    },

    update(dt: number): void {
      const input = states.input;
      if (!input) return;
      if (toastTimer > 0) toastTimer = Math.max(0, toastTimer - dt);

      if (input.justPressed('kick')) {
        returnHome();
        return;
      }

      if (dialogue.isOpen) {
        if (input.justPressed('confirm') || input.justPressed('interact') || input.justPressed('punch')) {
          dialogue.advance();
        }
        dialogue.update(dt);
        return;
      }

      if (phase === 'night') {
        // Color returns with dawn; tea thirst recovers
        tea.thirst = 35 + dawn * 85;
        if (thoughtTimer > 0) {
          thoughtTimer -= dt;
          if (thoughtTimer <= 0) {
            thought = null;
            // Advance on confirm or auto
          }
        }
        if (input.justPressed('confirm') || input.justPressed('interact') || thoughtTimer <= 0) {
          if (thoughtTimer > 0) {
            thoughtTimer = 0;
            thought = null;
          }
          pushThought();
        }
        return;
      }

      if (phase === 'montage') {
        montageTimer -= dt;
        if (input.justPressed('confirm') || input.justPressed('interact') || montageTimer <= 0) {
          montageIndex += 1;
          if (montageIndex >= FINALE_MONTAGE.length) {
            phase = 'help';
            showToast(NEWCOMER_LINES.ask, 2.2);
            syncHud();
          } else {
            montageTimer = 2.0;
          }
        }
        return;
      }

      if (phase === 'help') {
        if (input.justPressed('up') || input.justPressed('left')) {
          helpCursor = (helpCursor + helpChoices.length - 1) % helpChoices.length;
        }
        if (input.justPressed('down') || input.justPressed('right')) {
          helpCursor = (helpCursor + 1) % helpChoices.length;
        }
        if (input.justPressed('confirm') || input.justPressed('interact')) {
          const c = helpChoices[helpCursor]!;
          stayed = true;
          if (c.id === 'listen') showToast(NEWCOMER_LINES.listenOk, 2.2);
          else if (c.id === 'advise') showToast(NEWCOMER_LINES.adviseWeak, 2.2);
          else if (c.id === 'ask') showToast(NEWCOMER_LINES.askShare, 2.2);
          else if (c.id === 'pour') {
            showToast(NEWCOMER_LINES.pourPivo, 2.4);
            tea.pickup(1);
            tea.drink();
          }
          phase = 'credits';
          creditIndex = 0;
          creditTimer = 1.8;
          syncHud();
        }
        return;
      }

      if (phase === 'credits') {
        creditTimer -= dt;
        if (input.justPressed('confirm') || input.justPressed('interact') || creditTimer <= 0) {
          creditIndex += 1;
          if (creditIndex >= FINALE_CREDITS.length) {
            phase = 'done';
            unlockReplay();
            tea.thirst = 120;
            showToast(FINALE_CLOSING, 3);
            syncHud();
          } else {
            creditTimer = 1.6;
          }
        }
        return;
      }

      if (phase === 'done') {
        if (input.justPressed('confirm') || input.justPressed('interact')) {
          returnHome();
        }
      }
    },

    render(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      _s: SceneContext,
      width: number,
      height: number,
    ): void {
      // Empty apartment — dawn mix
      const night = 1 - dawn;
      px(ctx, 0, 0, width, height, '#1a1820');
      px(ctx, 0, 0, width, FLOOR_Y - 10, mixHex('#1a2030', '#6a88a8', dawn));
      px(ctx, 0, FLOOR_Y, width, height - FLOOR_Y, mixHex('#2a2430', '#5a5048', dawn));
      // Window glow
      segaBox(ctx, 220, 40, 60, 50, mixHex('#304060', '#c8d8f0', dawn), '#8090a8', {
        borderDark: '#203040',
      });
      // Minimal furniture silhouettes
      segaBox(ctx, 40, FLOOR_Y - 40, 50, 40, '#3a3440', '#605868', { borderDark: '#201820' });
      segaBox(ctx, 160, FLOOR_Y - 30, 40, 30, '#403848', '#685860', { borderDark: '#281820' });

      if (night > 0.2) {
        ctx.fillStyle = `rgba(8,10,18,${(night * 0.45).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }

      player.render(ctx, alpha);

      if (phase === 'night' && thought) {
        const label = `«${thought}»`;
        const tw = measureUiText(ctx, label, 8, 600) + 16;
        uiPanel(ctx, Math.round((width - tw) / 2), 70, tw, 22, 'rgba(8,10,16,0.88)', 'rgba(180,170,140,0.5)');
        drawUiTextCentered(ctx, label, width / 2, 76, '#f0e8d8', 8, 600);
        drawUiTextCentered(ctx, 'Enter — дальше', width / 2, 100, '#90a0b0', 5.5, 500);
      }

      if (phase === 'montage') {
        const m = FINALE_MONTAGE[Math.min(montageIndex, FINALE_MONTAGE.length - 1)]!;
        segaBox(ctx, 50, 60, width - 100, 70, '#2a2418', P.brass, { borderDark: P.brassDim });
        drawUiTextCentered(ctx, m.year, width / 2, 72, P.brassHi, 8, 650);
        drawUiTextCentered(ctx, m.title, width / 2, 92, P.diaryPages, 7, 550);
        drawUiTextCentered(ctx, 'Enter — пропуск', width / 2, 118, '#a09080', 5.5, 500);
      }

      if (phase === 'help') {
        segaBox(ctx, 36, 40, width - 72, 120, '#243038', '#708898', { borderDark: '#405060' });
        drawUiTextCentered(ctx, NEWCOMER_LINES.ask, width / 2, 50, '#e8e0d0', 6.5, 600);
        helpChoices.forEach((c, i) => {
          const sel = i === helpCursor;
          const ly = 72 + i * 18;
          if (sel) segaBox(ctx, 50, ly - 2, width - 100, 16, '#304050', '#c8b878', { borderDark: '#506070', inset: false });
          drawUiText(ctx, `${sel ? '>' : ' '} ${c.label}`, 58, ly, sel ? '#e8d090' : '#d0d8e0', 6.5, 550);
        });
      }

      if (phase === 'credits') {
        ctx.fillStyle = 'rgba(4,6,10,0.85)';
        ctx.fillRect(0, 0, width, height);
        const line = FINALE_CREDITS[Math.min(creditIndex, FINALE_CREDITS.length - 1)]!;
        drawUiTextCentered(ctx, line, width / 2, height / 2 - 8, '#e8e0d0', 9, 650);
        drawUiTextCentered(ctx, 'Enter', width / 2, height / 2 + 16, '#8090a0', 6, 500);
      }

      if (phase === 'done') {
        const tw = measureUiText(ctx, FINALE_CLOSING, 6.5, 550) + 14;
        uiPanel(ctx, Math.round((width - tw) / 2), 80, tw, 32, 'rgba(8,10,14,0.9)', 'rgba(160,180,120,0.5)');
        drawUiTextCentered(ctx, FINALE_CLOSING, width / 2, 86, '#e8e0d0', 6.5, 550);
        drawUiTextCentered(ctx, 'E — в квартиру (все уровни открыты)', width / 2, 102, '#90a090', 5.5, 500);
      }

      if (toastTimer > 0 && toast) {
        const tw = measureUiText(ctx, toast, 6, 550) + 12;
        uiPanel(ctx, Math.round((width - tw) / 2), height - 34, tw, 14, 'rgba(8,10,14,0.88)', 'rgba(160,160,120,0.5)');
        drawUiTextCentered(ctx, toast, width / 2, height - 31, '#e8e0d0', 6, 550);
      }

      if (dialogue.isOpen) dialogue.render(ctx, width, height);
      if (phase === 'night') {
        tea.renderCrisis(ctx, width, height, player.x, player.y);
      }
      drawUiText(ctx, 'K — выход', 4, height - 10, '#607080', 5, 500);
      void stayed;
      void alpha;
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    debugForcePhase(p: Phase): void {
      dialogue.resetSilent();
      phase = p;
      if (p === 'done') unlockReplay();
      if (p === 'montage') {
        montageIndex = 0;
        montageTimer = 2;
        dawn = 1;
      }
      if (p === 'credits') {
        creditIndex = 0;
        creditTimer = 1.5;
      }
      syncHud();
    },
  };
}

function mixHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ] as const;
  const A = parse(a);
  const B = parse(b);
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(A[0] + (B[0] - A[0]) * u);
  const g = Math.round(A[1] + (B[1] - A[1]) * u);
  const bl = Math.round(A[2] + (B[2] - A[2]) * u);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}
