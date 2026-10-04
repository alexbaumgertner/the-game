/**
 * ERA_2015 — Level 11 «Круг».
 * Chairs, 12-step wall (paraphrase), honesty quiz vs «Умный».
 */

import type { SceneContext, StateManager } from '@/core/StateManager';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { SparkMeter } from '@/ui/SparkMeter';
import { DialogueSystem } from '@/systems/DialogueSystem';
import { QuizSystem } from '@/systems/QuizSystem';
import { px, segaBox } from '@/art/pixelDraw';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import {
  FIRST_NAME_STUBS,
  KRUG_ANON_SIGN,
  KRUG_MONTAGE_SEASONS,
  KRUG_NOTE,
  KRUG_STEPS_1_3,
  KRUG_STEPS_10_12,
  STEP_WALL_LABELS,
} from '@/data/krugObjections';

const WIDTH = LOGICAL_WIDTH;
const FLOOR_Y = 188;

type Phase = 'intro' | 'steps' | 'montage' | 'finale' | 'done';

export interface KrugSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  tea: TeaSystem;
  spark?: SparkMeter;
}

export function createKrug2015Scene(deps: KrugSceneDeps) {
  const { states, player, hud, tea } = deps;
  const spark = deps.spark ?? new SparkMeter();
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  let phase: Phase = 'intro';
  let stepLit = 0; // 0..12
  let beatIndex = 0;
  let montageIndex = 0;
  let montageTimer = 0;
  let desat = 0;
  let toast = '';
  let toastTimer = 0;
  let silence = false;

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
      eraLabel: 'ЗУИЧ · 2015',
      levelTitle: 'Круг',
      objective:
        phase === 'done'
          ? 'УР. 11 ПРОЙДЕН'
          : phase === 'montage'
            ? 'Монтаж · Enter пропуск'
            : phase === 'finale'
              ? 'Шаги 10–12'
              : 'Шаги 1–3 · честность',
    });
  };

  const returnHome = (cleared: boolean): void => {
    if (cleared) states.setFlag('level11Cleared', true);
    states.goto('apartment_2026', {
      era: 'ERA_2026',
      fadeSeconds: 0.45,
      data: { afterLevel11: cleared },
    });
  };

  const openBeat = (list: typeof KRUG_STEPS_1_3, index: number, onDone: () => void): void => {
    const beat = list[index];
    if (!beat) {
      onDone();
      return;
    }
    quiz.openHonesty('Умный', beat.prompt, beat.answers, beat.honestIndex, {
      subject: 'круг',
      onHonest: () => {
        silence = false;
        desat = Math.max(0, desat - 0.2);
        spark.add(0.12);
        stepLit = Math.min(12, stepLit + 1);
        showToast('Шаг зажжён.', 1.2);
        onDone();
      },
      onClever: () => {
        silence = true;
        desat = Math.min(0.7, desat + 0.25);
        spark.drain(0.14);
        showToast('Тишина после умного ответа.', 1.6);
        // continue — slip ≠ end
        onDone();
      },
    });
  };

  const startSteps = (): void => {
    phase = 'steps';
    beatIndex = 0;
    openBeat(KRUG_STEPS_1_3, 0, () => {
      beatIndex = 1;
      openBeat(KRUG_STEPS_1_3, 1, () => {
        beatIndex = 2;
        openBeat(KRUG_STEPS_1_3, 2, () => {
          phase = 'montage';
          montageIndex = 0;
          montageTimer = 2.2;
          stepLit = Math.max(stepLit, 3);
          syncHud();
        });
      });
    });
    syncHud();
  };

  const startFinale = (): void => {
    phase = 'finale';
    beatIndex = 0;
    stepLit = Math.max(stepLit, 9);
    openBeat(KRUG_STEPS_10_12, 0, () => {
      openBeat(KRUG_STEPS_10_12, 1, () => {
        openBeat(KRUG_STEPS_10_12, 2, () => {
          stepLit = 12;
          phase = 'done';
          spark.add(0.15);
          states.setFlag('level11Cleared', true);
          showToast(KRUG_NOTE, 3.2);
          syncHud();
        });
      });
    });
    syncHud();
  };

  return {
    enter(): void {
      tea.pauseForFlashback();
      spark.reset(0.5);
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.setFloorY(FLOOR_Y);
      player.x = WIDTH / 2;
      player.y = FLOOR_Y;
      phase = 'intro';
      stepLit = 0;
      beatIndex = 0;
      montageIndex = 0;
      desat = 0;
      silence = false;
      toast = '';
      toastTimer = 0;
      dialogue.open(
        {
          id: 'krug_intro',
          start: 'a',
          lines: {
            a: {
              speaker: 'Зуич',
              text: 'Круг стульев. На стене — программа 12 шагов (своими словами).',
              next: 'b',
            },
            b: {
              speaker: FIRST_NAME_STUBS[0]!,
              text: KRUG_ANON_SIGN,
              next: 'c',
            },
            c: {
              speaker: 'Зуич',
              text: 'Умный во мне захочет победить в споре. Честный ответ короче.',
              next: null,
            },
          },
        },
        () => startSteps(),
      );
      syncHud();
    },

    exit(): void {
      dialogue.resetSilent();
      quiz.closeSilent();
    },

    update(dt: number): void {
      const input = states.input;
      if (!input) return;
      if (toastTimer > 0) toastTimer = Math.max(0, toastTimer - dt);
      if (desat > 0 && !silence) desat = Math.max(0, desat - dt * 0.05);

      if (input.justPressed('kick') || (phase === 'done' && (input.justPressed('interact') || input.justPressed('confirm')))) {
        returnHome(phase === 'done' || states.flags.level11Cleared);
        return;
      }

      if (dialogue.isOpen) {
        if (input.justPressed('confirm') || input.justPressed('interact') || input.justPressed('punch')) {
          dialogue.advance();
        }
        dialogue.update(dt);
        return;
      }

      if (quiz.isOpen) {
        if (input.justPressed('choice1')) quiz.selectAnswer(0);
        if (input.justPressed('choice2')) quiz.selectAnswer(1);
        if (input.justPressed('choice3')) quiz.selectAnswer(2);
        if (input.justPressed('choice4')) quiz.selectAnswer(3);
        quiz.update(dt);
        return;
      }

      if (phase === 'montage') {
        montageTimer -= dt;
        if (input.justPressed('confirm') || input.justPressed('interact') || montageTimer <= 0) {
          montageIndex += 1;
          if (montageIndex >= KRUG_MONTAGE_SEASONS.length) {
            stepLit = Math.max(stepLit, 9);
            startFinale();
          } else {
            montageTimer = 2.0;
            stepLit = Math.max(stepLit, 3 + montageIndex);
            showToast(KRUG_MONTAGE_SEASONS[montageIndex - 1] ?? '', 1.4);
          }
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
      px(ctx, 0, 0, width, height, '#2a2830');
      px(ctx, 0, FLOOR_Y, width, height - FLOOR_Y, '#3a3840');

      // Circle of chairs
      const cx = width / 2;
      const cy = FLOOR_Y - 20;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const x = Math.round(cx + Math.cos(ang) * 70);
        const y = Math.round(cy + Math.sin(ang) * 28);
        segaBox(ctx, x - 6, y - 10, 12, 14, '#4a4038', '#8a7860', { borderDark: '#2a2018' });
      }

      // Wall steps
      segaBox(ctx, 8, 20, 100, 150, '#3a3848', '#708098', { borderDark: '#303040' });
      drawUiText(ctx, '12 шагов', 14, 26, '#e8e0d0', 6, 650);
      STEP_WALL_LABELS.forEach((lab, i) => {
        const lit = i < stepLit;
        drawUiText(ctx, lab, 12, 40 + i * 10, lit ? '#e8d090' : '#606878', 4.5, lit ? 600 : 400);
      });

      // Anon sign
      const sw = measureUiText(ctx, KRUG_ANON_SIGN, 5, 500) + 10;
      uiPanel(ctx, Math.round((width - sw) / 2), 8, sw, 12, 'rgba(10,12,18,0.85)', 'rgba(160,160,180,0.45)');
      drawUiTextCentered(ctx, KRUG_ANON_SIGN, width / 2, 10, '#d0d0e0', 5, 500);

      // Name stubs
      FIRST_NAME_STUBS.forEach((n, i) => {
        drawUiText(ctx, n, width - 40, 40 + i * 12, '#90a0b0', 5.5, 500);
      });

      if (desat > 0.05 || silence) {
        ctx.fillStyle = `rgba(30,32,40,${(Math.max(desat, silence ? 0.35 : 0) * 0.7).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }

      player.render(ctx, alpha);
      spark.draw(ctx, width, 44);

      if (phase === 'montage') {
        const line = KRUG_MONTAGE_SEASONS[Math.min(montageIndex, KRUG_MONTAGE_SEASONS.length - 1)]!;
        const tw = measureUiText(ctx, line, 7, 600) + 16;
        uiPanel(ctx, Math.round((width - tw) / 2), 90, tw, 28, 'rgba(8,10,16,0.9)', 'rgba(160,150,120,0.5)');
        drawUiTextCentered(ctx, line, width / 2, 96, '#e8e0d0', 7, 600);
        drawUiTextCentered(ctx, 'Enter — дальше / пропуск', width / 2, 110, '#90a090', 5.5, 500);
      }

      if (phase === 'done') {
        const tw = measureUiText(ctx, KRUG_NOTE, 6, 550) + 14;
        uiPanel(ctx, Math.round((width - tw) / 2), 78, tw, 32, 'rgba(8,10,16,0.9)', 'rgba(140,160,180,0.5)');
        drawUiTextCentered(ctx, KRUG_NOTE, width / 2, 84, '#e8e0d0', 6, 550);
        drawUiTextCentered(ctx, 'E — в квартиру', width / 2, 100, '#90a0b0', 6, 500);
      }

      if (toastTimer > 0 && toast) {
        const tw = measureUiText(ctx, toast, 6, 550) + 12;
        uiPanel(ctx, Math.round((width - tw) / 2), height - 34, tw, 14, 'rgba(8,10,14,0.88)', 'rgba(160,160,120,0.5)');
        drawUiTextCentered(ctx, toast, width / 2, height - 31, '#e8e0d0', 6, 550);
      }

      if (dialogue.isOpen) dialogue.render(ctx, width, height);
      if (quiz.isOpen) quiz.render(ctx, width, height);
      drawUiText(ctx, 'K — выход', 4, height - 10, '#607080', 5, 500);
      void beatIndex;
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    getQuiz(): QuizSystem {
      return quiz;
    },

    debugForceDone(): void {
      dialogue.resetSilent();
      quiz.closeSilent();
      stepLit = 12;
      phase = 'done';
      states.setFlag('level11Cleared', true);
      syncHud();
    },
  };
}
