/**
 * ERA_2015 — Level 10 «Распорядок».
 * Voluntary day schedule; spark grows from choices. No game over.
 */

import type { SceneContext, StateManager } from '@/core/StateManager';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { SparkMeter } from '@/ui/SparkMeter';
import { DialogueSystem } from '@/systems/DialogueSystem';
import { px, segaBox } from '@/art/pixelDraw';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import {
  REHAB_ACTIONS,
  REHAB_DAYS,
  REHAB_INTRO,
  SLOT_LABEL,
  type DaySlot,
} from '@/data/rehabNarrative';

const FLOOR_Y = 188;
const SLOTS: DaySlot[] = ['morning', 'day', 'evening'];

export interface RehabSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  tea: TeaSystem;
  spark?: SparkMeter;
}

export function createRehab2015Scene(deps: RehabSceneDeps) {
  const { states, player, hud, tea } = deps;
  const spark = deps.spark ?? new SparkMeter();
  const dialogue = new DialogueSystem();

  let day = 0;
  let slotIndex = 0;
  let cursor = 0;
  let toast = '';
  let toastTimer = 0;
  let phase: 'intro' | 'pick' | 'vignette' | 'done' = 'intro';
  let used = new Set<string>();

  const showToast = (m: string, s = 1.6): void => {
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
      eraLabel: 'ЗУИЧ · 2015',
      levelTitle: 'Распорядок',
      objective:
        phase === 'done'
          ? 'УР. 10 ПРОЙДЕН'
          : phase === 'intro'
            ? 'Слушай'
            : `День ${day + 1}/${REHAB_DAYS} · ${SLOT_LABEL[SLOTS[slotIndex]!]}`,
    });
  };

  const returnHome = (cleared: boolean): void => {
    if (cleared) states.setFlag('level10Cleared', true);
    states.goto('apartment_2026', {
      era: 'ERA_2026',
      fadeSeconds: 0.45,
      data: { afterLevel10: cleared },
    });
  };

  const afterVignette = (): void => {
    slotIndex += 1;
    if (slotIndex >= SLOTS.length) {
      day += 1;
      slotIndex = 0;
      used = new Set();
      if (day >= REHAB_DAYS) {
        if (spark.value >= 0.85) {
          phase = 'done';
          spark.value = 1;
          states.setFlag('level10Cleared', true);
          showToast('Дни закрыты. Искра полная.', 2.4);
          syncHud();
          return;
        }
        // Soft extra day slot until spark is warm enough
        day = REHAB_DAYS - 1;
        slotIndex = 2;
        showToast('Ещё один выбор — догреть искру.', 2);
      }
    }
    phase = 'pick';
    cursor = 0;
    syncHud();
  };

  const pickAction = (): void => {
    const act = REHAB_ACTIONS[cursor];
    if (!act || used.has(act.id)) return;
    used.add(act.id);
    spark.add(act.spark);
    phase = 'vignette';
    dialogue.open(act.vignette, () => afterVignette());
    syncHud();
  };

  return {
    enter(): void {
      tea.pauseForFlashback();
      spark.reset(0.35);
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.setFloorY(FLOOR_Y);
      player.x = 100;
      player.y = FLOOR_Y;
      day = 0;
      slotIndex = 0;
      cursor = 0;
      used = new Set();
      phase = 'intro';
      toast = '';
      toastTimer = 0;
      dialogue.open(REHAB_INTRO, () => {
        phase = 'pick';
        syncHud();
      });
      syncHud();
    },

    exit(): void {
      dialogue.resetSilent();
    },

    update(dt: number): void {
      const input = states.input;
      if (!input) return;
      if (toastTimer > 0) toastTimer = Math.max(0, toastTimer - dt);

      if (input.justPressed('kick') || (phase === 'done' && (input.justPressed('interact') || input.justPressed('confirm')))) {
        returnHome(phase === 'done' || states.flags.level10Cleared);
        return;
      }

      if (dialogue.isOpen) {
        if (input.justPressed('confirm') || input.justPressed('interact') || input.justPressed('punch')) {
          dialogue.advance();
        }
        dialogue.update(dt);
        return;
      }

      if (phase === 'done') return;
      if (phase !== 'pick') return;

      if (input.justPressed('up') || input.justPressed('left')) {
        cursor = (cursor + REHAB_ACTIONS.length - 1) % REHAB_ACTIONS.length;
      }
      if (input.justPressed('down') || input.justPressed('right')) {
        cursor = (cursor + 1) % REHAB_ACTIONS.length;
      }
      if (input.justPressed('confirm') || input.justPressed('interact')) {
        pickAction();
      }
    },

    render(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      _s: SceneContext,
      width: number,
      height: number,
    ): void {
      // Corridor / rooms — warm-cool calm
      px(ctx, 0, 0, width, height, '#2a3038');
      px(ctx, 0, 0, width, FLOOR_Y - 20, '#3a4850');
      px(ctx, 0, FLOOR_Y, width, height - FLOOR_Y, '#4a5048');
      // Schedule board
      segaBox(ctx, width - 100, 28, 88, 100, '#3a4038', '#8a9880', { borderDark: '#2a3028' });
      drawUiText(ctx, 'ДОСКА ДНЯ', width - 92, 34, '#e8e0c8', 5.5, 650);
      drawUiText(ctx, `День ${day + 1}`, width - 92, 48, '#c8d0b0', 6, 500);
      SLOTS.forEach((sl, i) => {
        const slotDone = i < slotIndex;
        const cur = i === slotIndex && phase === 'pick';
        drawUiText(
          ctx,
          `${cur ? '>' : ' '} ${SLOT_LABEL[sl]}`,
          width - 92,
          64 + i * 14,
          cur ? '#e8d090' : slotDone ? '#809070' : '#a0a898',
          5.5,
          500,
        );
      });

      // Doors
      for (let i = 0; i < 3; i++) {
        segaBox(ctx, 20 + i * 70, 70, 50, FLOOR_Y - 70, '#4a5860', '#708088', {
          borderDark: '#303840',
        });
      }

      player.render(ctx, alpha);
      spark.draw(ctx, width, 44);

      if (phase === 'pick') {
        const bx = 24;
        const by = 36;
        segaBox(ctx, bx, by, 170, 130, '#243038', '#708898', { borderDark: '#405060' });
        drawUiText(ctx, 'Выбери действие', bx + 8, by + 6, '#e8e0d0', 6.5, 650);
        REHAB_ACTIONS.forEach((a, i) => {
          const ly = by + 22 + i * 16;
          const selected = i === cursor;
          const dim = used.has(a.id);
          if (selected && !dim) {
            segaBox(ctx, bx + 4, ly - 2, 162, 14, '#304050', '#c8b878', {
              borderDark: '#506070',
              inset: false,
            });
          }
          drawUiText(
            ctx,
            `${selected ? '>' : ' '} ${a.label}${dim ? ' · было' : ''}`,
            bx + 8,
            ly,
            dim ? '#607080' : selected ? '#e8d090' : '#d0d8e0',
            6,
            550,
          );
        });
      }

      if (phase === 'done') {
        const line = 'Распорядок — добровольный. Искра твоя.';
        const tw = measureUiText(ctx, line, 7, 600) + 16;
        uiPanel(ctx, Math.round((width - tw) / 2), 80, tw, 28, 'rgba(8,12,16,0.9)', 'rgba(140,180,140,0.5)');
        drawUiTextCentered(ctx, line, width / 2, 86, '#e8e0d0', 7, 600);
        drawUiTextCentered(ctx, 'E — в квартиру', width / 2, 100, '#90a090', 6, 500);
      }

      if (toastTimer > 0 && toast) {
        const tw = measureUiText(ctx, toast, 6.5, 550) + 14;
        uiPanel(ctx, Math.round((width - tw) / 2), height - 34, tw, 14, 'rgba(8,10,14,0.88)', 'rgba(160,180,120,0.5)');
        drawUiTextCentered(ctx, toast, width / 2, height - 31, '#e8e0d0', 6.5, 550);
      }

      if (dialogue.isOpen) dialogue.render(ctx, width, height);
      drawUiText(ctx, 'K — выход', 4, height - 10, '#607080', 5, 500);
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    debugForceDone(): void {
      dialogue.resetSilent();
      spark.reset(1);
      phase = 'done';
      states.setFlag('level10Cleared', true);
      syncHud();
    },
  };
}
