import { audio } from '@/audio';
/**
 * ERA_2010 — Level 9 «Армия».
 * Приказ ↔ Искра: absurd tasks, sergeant view cone, quiet micro-autonomy.
 * No hazing / real units. Spark 0 → round restart (no game over).
 */

import type { SceneContext, StateManager } from '@/core/StateManager';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { SparkMeter } from '@/ui/SparkMeter';
import { DialogueSystem } from '@/systems/DialogueSystem';
import { applyLightingOverlay } from '@/render/LightingOverlay';
import { px, segaBox } from '@/art/pixelDraw';
import {
  armiyaViewCaption,
  armiyaViewProgress,
  armiyaViewsReady,
  drawArmiyaBackdrop,
  preloadArmiyaViews,
} from '@/art/armiyaViews';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import {
  ARMY_CLOSING_PHRASE,
  ARMY_ROUND_SECONDS,
  ARMY_ROUNDS,
  ARMY_TASKS,
  CAUGHT_LINES,
  INTRO_SCRIPT,
  NIGHT_CHOICES,
  QUIET_SPARK_ACTS,
  ROUND_FAIL_LINE,
  type ArmyTask,
} from '@/data/armiyaNarrative';

const WIDTH = LOGICAL_WIDTH;
const FLOOR_Y = 188;

/** Khaki / cold gray palette — ≤15 colors on screen. */
const C = {
  sky: '#3a4450',
  skyDim: '#2a343e',
  ground: '#4a5340',
  groundDark: '#3a4234',
  wall: '#5a6048',
  wallDark: '#3a4030',
  khaki: '#6a7048',
  khakiHi: '#8a9060',
  gray: '#707880',
  grayDim: '#505860',
  accent: '#c8b878',
  text: '#e8e0d0',
  danger: '#c06050',
  spark: '#70a0c8',
} as const;

type Phase = 'intro' | 'round' | 'scold' | 'fail' | 'night' | 'done';

export interface ArmiyaSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  tea: TeaSystem;
  spark?: SparkMeter;
}

export function createArmiya2010Scene(deps: ArmiyaSceneDeps) {
  const { states, player, hud, tea } = deps;
  const spark = deps.spark ?? new SparkMeter();
  const dialogue = new DialogueSystem();

  let phase: Phase = 'intro';
  let round = 0;
  let timer = ARMY_ROUND_SECONDS;
  let taskProgress = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let scoldTimer = 0;
  let failTimer = 0;
  let nightCursor = 0;
  let thought: string | null = null;
  let thoughtTimer = 0;
  let sargeX = 220;
  let sargeFacing: 1 | -1 = -1;
  let sargeLookAway = false;
  let lookTimer = 0;
  let quietCooldown = 0;
  let pausedHint = false;
  /** Capture override: force plate progress 0…1, or null for live mapping. */
  let debugViewProgress: number | null = null;

  const task = (): ArmyTask => ARMY_TASKS[Math.min(round, ARMY_TASKS.length - 1)]!;

  const showToast = (msg: string, sec = 1.8): void => {
    toast = msg;
    toastTimer = sec;
  };

  const syncHud = (): void => {
    const t = task();
    hud.set({
      hp: player.hp,
      maxHp: MAX_FORTITUDE,
      fortitude: player.mentalFortitude,
      maxFortitude: MAX_FORTITUDE,
      swagger: 0,
      showSwagger: false,
      eraLabel: 'ЗУИЧ · 2010',
      levelTitle: 'Армия',
      objective:
        phase === 'intro'
          ? 'Слушай'
          : phase === 'round'
            ? `Круг ${round + 1}/${ARMY_ROUNDS} · ${t.title}`
            : phase === 'night'
              ? 'Последние минуты'
              : phase === 'done'
                ? 'УР. 9 ПРОЙДЕН'
                : phase === 'fail'
                  ? 'Искра…'
                  : 'Сержант',
      paused: false,
    });
  };

  const returnHome = (cleared: boolean): void => {
    if (cleared) states.setFlag('level9Cleared', true);
    states.goto('apartment_2026', {
      era: 'ERA_2026',
      fadeSeconds: 0.45,
      data: { afterLevel9: cleared },
    });
  };

  const startRound = (index: number): void => {
    round = index;
    phase = 'round';
    timer = ARMY_ROUND_SECONDS;
    taskProgress = 0;
    quietCooldown = 0.4;
    syncHud();
  };

  const catchPlayer = (): void => {
    phase = 'scold';
    scoldTimer = 2.2;
    spark.drain(0.18);
    showToast(CAUGHT_LINES[round % CAUGHT_LINES.length]!);
    syncHud();
  };

  const completeRound = (): void => {
    if (round + 1 >= ARMY_ROUNDS) {
      phase = 'night';
      nightCursor = 0;
      showToast('Отбой. Минуты свои.', 2.2);
    } else {
      startRound(round + 1);
      showToast('Круг закрыт. Дальше — ещё абсурднее.', 1.6);
    }
    syncHud();
  };

  const failRound = (): void => {
    phase = 'fail';
    failTimer = 1.6;
    showToast(ROUND_FAIL_LINE, 1.6);
    syncHud();
  };

  const finishNight = (choiceIndex: number): void => {
    const choice = NIGHT_CHOICES[choiceIndex] ?? NIGHT_CHOICES[0]!;
    phase = 'done';
    spark.add(0.2);
    thought = choice.line;
    thoughtTimer = 2.4;
    showToast(ARMY_CLOSING_PHRASE, 3.2);
    states.setFlag('level9Cleared', true);
    syncHud();
  };

  return {
    enter(_ctx: SceneContext): void {
      preloadArmiyaViews();
      audio.playTheme('army');
      tea.pauseForFlashback();
      spark.reset(0.62);
      audio.setArmySpark(spark.value);
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.setFloorY(FLOOR_Y);
      player.x = 80;
      player.y = FLOOR_Y;
      player.vx = 0;
      player.facing = 1;
      phase = 'intro';
      round = 0;
      timer = ARMY_ROUND_SECONDS;
      taskProgress = 0;
      toast = '';
      toastTimer = 0;
      time = 0;
      thought = null;
      thoughtTimer = 0;
      sargeX = 240;
      sargeFacing = -1;
      sargeLookAway = false;
      lookTimer = 1.2;
      quietCooldown = 0;
      nightCursor = 0;
      pausedHint = false;
      dialogue.open(INTRO_SCRIPT, () => {
        startRound(0);
      });
      syncHud();
    },

    exit(): void {
      dialogue.resetSilent();
    },

    update(dt: number): void {
      time += dt;
      audio.setArmySpark(spark.value);
      const input = states.input;
      if (!input) return;

      if (toastTimer > 0) toastTimer = Math.max(0, toastTimer - dt);
      if (thoughtTimer > 0) {
        thoughtTimer = Math.max(0, thoughtTimer - dt);
        if (thoughtTimer <= 0) thought = null;
      }
      if (quietCooldown > 0) quietCooldown = Math.max(0, quietCooldown - dt);

      // Always allow exit to apartment (confirm on done / Escape handled by pause;
      // interact+down or special: use punch while holding down? Use 'special' or double)
      // Spec: pause / exit always — KeyE on done, or long confirm. Also 'kick' as exit.
      if (input.justPressed('kick') || (phase === 'done' && input.justPressed('confirm'))) {
        returnHome(phase === 'done' || states.flags.level9Cleared);
        return;
      }
      if (phase === 'done' && input.justPressed('interact')) {
        returnHome(true);
        return;
      }

      if (dialogue.isOpen) {
        if (
          input.justPressed('confirm') ||
          input.justPressed('interact') ||
          input.justPressed('punch')
        ) {
          dialogue.advance();
        }
        dialogue.update(dt);
        return;
      }

      // Sergeant patrol / look
      lookTimer -= dt;
      if (lookTimer <= 0) {
        sargeLookAway = !sargeLookAway;
        lookTimer = sargeLookAway ? 1.4 + Math.random() * 0.8 : 1.8 + Math.random() * 1.2;
        sargeFacing = sargeLookAway ? 1 : -1;
      }
      sargeX = 200 + Math.sin(time * 0.7) * 40;

      if (phase === 'scold') {
        scoldTimer -= dt;
        if (scoldTimer <= 0) {
          phase = 'round';
          syncHud();
        }
        return;
      }

      if (phase === 'fail') {
        failTimer -= dt;
        if (failTimer <= 0) {
          spark.reset(0.45);
          startRound(round);
        }
        return;
      }

      if (phase === 'night') {
        if (input.justPressed('up') || input.justPressed('left')) {
          nightCursor = (nightCursor + NIGHT_CHOICES.length - 1) % NIGHT_CHOICES.length;
        }
        if (input.justPressed('down') || input.justPressed('right')) {
          nightCursor = (nightCursor + 1) % NIGHT_CHOICES.length;
        }
        if (input.justPressed('confirm') || input.justPressed('interact')) {
          finishNight(nightCursor);
        }
        return;
      }

      if (phase === 'done') return;

      if (phase !== 'round') return;

      const t = task();
      timer -= dt;

      // Work: hold interact
      const holding = input.isDown('interact') || input.isDown('confirm');
      if (holding) {
        taskProgress = Math.min(1, taskProgress + t.holdFillPerSec * dt);
        spark.drain(t.sparkDrainPerSec * dt);
        // Caught if sergeant looking
        if (!sargeLookAway && Math.random() < dt * 0.35) {
          // only when actively working and facing him-ish
          catchPlayer();
          return;
        }
      } else {
        taskProgress = Math.max(0, taskProgress - t.decayPerSec * dt);
      }

      // Quiet spark when looking away
      if (
        sargeLookAway &&
        quietCooldown <= 0 &&
        (input.justPressed('punch') || input.justPressed('special'))
      ) {
        const act = QUIET_SPARK_ACTS[Math.floor(Math.random() * QUIET_SPARK_ACTS.length)]!;
        spark.add(act.spark);
        thought = act.thought;
        thoughtTimer = 1.8;
        quietCooldown = 1.1;
        showToast(act.label, 1.2);
      }

      if (spark.value <= 0.001) {
        spark.value = 0;
        failRound();
        return;
      }

      if (taskProgress >= 1) {
        completeRound();
        return;
      }

      if (timer <= 0) {
        // Time up — if enough progress, pass; else soft fail restart
        if (taskProgress >= 0.72) completeRound();
        else failRound();
      }

      // Mild walk
      const axis = input.axisX();
      player.x = Math.max(24, Math.min(WIDTH - 24, player.x + axis * 40 * dt));
      if (axis !== 0) player.facing = axis > 0 ? 1 : -1;
      player.y = FLOOR_Y;

      syncHud();
      void pausedHint;
    },

    render(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      _ctxScene: SceneContext,
      width: number,
      height: number,
    ): void {
      const desat = 1 - spark.value;
      const grid = 4 + Math.floor(desat * 8);
      const viewProg =
        debugViewProgress ?? armiyaViewProgress(phase, round, ARMY_ROUNDS);

      // Far plates (parade / slogan / yard / …) above the playable square
      if (armiyaViewsReady()) {
        drawArmiyaBackdrop(ctx, width, height, viewProg, time);
      } else {
        px(ctx, 0, 0, width, height, C.skyDim);
        px(ctx, 0, 0, width, FLOOR_Y - 40, C.sky);
        segaBox(ctx, 8, 40, 70, 90, C.wall, C.grayDim, { borderDark: C.wallDark });
        px(ctx, 20, 70, 20, 28, C.skyDim);
        px(ctx, 48, 100, 14, 28, C.wallDark);
      }

      // Square tiles — more grid when spark low (gameplay band)
      const tileTop = FLOOR_Y - 40;
      for (let y = tileTop; y < FLOOR_Y; y += grid) {
        for (let x = 0; x < width; x += grid) {
          const on = ((x + y) / grid) % 2 === 0;
          const base = on ? C.ground : C.groundDark;
          // Soft tiles over plate seam so sprites read
          if (armiyaViewsReady()) {
            ctx.fillStyle = on ? 'rgba(74,83,64,0.72)' : 'rgba(58,66,52,0.78)';
            ctx.fillRect(x, y, grid, grid);
          } else {
            px(ctx, x, y, grid, grid, base);
          }
        }
      }
      px(ctx, 0, FLOOR_Y, width, height - FLOOR_Y, C.wallDark);

      // Desat wash
      if (desat > 0.05) {
        ctx.fillStyle = `rgba(40,44,50,${(desat * 0.55).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Task prop
      const t = task();
      if (t.id === 'paint_grass') {
        px(ctx, 120, FLOOR_Y - 8, 80, 6, '#3a6030');
        px(ctx, 120, FLOOR_Y - 8, Math.floor(80 * taskProgress), 6, '#50a040');
      } else if (t.id === 'sweep_square') {
        px(ctx, 110, FLOOR_Y - 2, 100, 2, C.gray);
        px(ctx, 110, FLOOR_Y - 2, Math.floor(100 * taskProgress), 2, C.accent);
      } else {
        const h = Math.floor(18 * Math.sin(taskProgress * Math.PI));
        px(ctx, 150, FLOOR_Y - h, 24, Math.max(2, h), C.groundDark);
        px(ctx, 178, FLOOR_Y - (18 - h), 20, Math.max(2, 18 - h), C.ground);
      }

      // Sergeant
      const sx = Math.round(sargeX);
      px(ctx, sx - 6, FLOOR_Y - 36, 12, 28, C.khaki);
      px(ctx, sx - 5, FLOOR_Y - 34, 10, 8, C.khakiHi);
      px(ctx, sx - 4, FLOOR_Y - 44, 8, 8, '#c8b090');
      px(ctx, sx - 3, FLOOR_Y - 42, 2, 2, '#202028');
      px(ctx, sx + 1, FLOOR_Y - 42, 2, 2, '#202028');
      // View cone via lighting
      applyLightingOverlay(ctx, 0, width, height, {
        ambient: { color: phase === 'night' || phase === 'done' ? 'rgba(10,12,20,0.55)' : 'rgba(30,34,40,0.22)' },
        points: [],
        cones: sargeLookAway
          ? []
          : [
              {
                kind: 'headlight',
                x: sx,
                y: FLOOR_Y - 30,
                facing: sargeFacing,
                length: 90,
                spread: 36,
                color: '#c8b878',
                screenSpace: true,
              },
            ],
        time,
      });

      player.render(ctx, alpha);

      // Progress / timer
      if (phase === 'round' || phase === 'scold') {
        const barW = 120;
        const bx = Math.round((width - barW) / 2);
        const by = 36;
        uiPanel(ctx, bx - 4, by - 4, barW + 8, 22, 'rgba(8,10,14,0.8)', 'rgba(140,150,120,0.5)');
        drawUiTextCentered(ctx, t.prompt, width / 2, by - 2, C.text, 5.5, 500);
        ctx.fillStyle = '#202830';
        ctx.fillRect(bx, by + 10, barW, 4);
        ctx.fillStyle = C.accent;
        ctx.fillRect(bx, by + 10, Math.floor(barW * taskProgress), 4);
        drawUiText(ctx, `${Math.ceil(Math.max(0, timer))}с`, bx + barW - 18, by + 8, C.gray, 5, 500);
        if (sargeLookAway) {
          drawUiTextCentered(ctx, 'отвернулся — J: тихая искра', width / 2, by + 20, C.spark, 5.5, 600);
        }
      }

      spark.draw(ctx, width, 44);

      if (phase === 'night') {
        ctx.fillStyle = 'rgba(6,8,14,0.72)';
        ctx.fillRect(0, 0, width, height);
        segaBox(ctx, 40, 40, width - 80, 120, '#1a2030', C.gray, { borderDark: '#303848' });
        drawUiTextCentered(ctx, 'Отбой. Последние минуты.', width / 2, 52, C.text, 7, 650);
        NIGHT_CHOICES.forEach((c, i) => {
          const selected = i === nightCursor;
          const ly = 74 + i * 22;
          if (selected) {
            segaBox(ctx, 56, ly - 2, width - 112, 18, '#243040', C.accent, {
              borderDark: '#405060',
              inset: false,
            });
          }
          drawUiText(ctx, `${selected ? '>' : ' '} ${c.label}`, 64, ly, selected ? C.accent : C.text, 6.5, 600);
        });
      }

      if (phase === 'done') {
        const line = ARMY_CLOSING_PHRASE;
        const tw = measureUiText(ctx, line, 7, 600) + 16;
        uiPanel(ctx, Math.round((width - tw) / 2), 70, tw, 28, 'rgba(8,10,16,0.88)', 'rgba(160,180,120,0.55)');
        drawUiTextCentered(ctx, line, width / 2, 76, C.text, 7, 600);
        drawUiTextCentered(ctx, 'E — в квартиру', width / 2, 92, C.gray, 6, 500);
      }

      if (thought) {
        const tw = measureUiText(ctx, `«${thought}»`, 6.5, 500) + 12;
        const bx = Math.round(Math.max(4, Math.min(width - tw - 4, player.x - tw / 2)));
        uiPanel(ctx, bx, FLOOR_Y - 58, tw, 14, 'rgba(10,12,18,0.8)', 'rgba(160,180,200,0.4)');
        drawUiText(ctx, `«${thought}»`, bx + 6, FLOOR_Y - 55, C.text, 6.5, 500);
      }

      if (toastTimer > 0 && toast) {
        const tw = measureUiText(ctx, toast, 6.5, 550) + 14;
        uiPanel(
          ctx,
          Math.round((width - tw) / 2),
          height - 36,
          tw,
          16,
          'rgba(10,12,16,0.88)',
          'rgba(180,160,100,0.55)',
        );
        drawUiTextCentered(ctx, toast, width / 2, height - 32, C.text, 6.5, 550);
      }

      if (dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      }

      if (
        armiyaViewsReady() &&
        phase !== 'night' &&
        phase !== 'done' &&
        !dialogue.isOpen
      ) {
        const caption = armiyaViewCaption(viewProg);
        const cw = measureUiText(ctx, caption, 6.5, 500) + 10;
        uiPanel(
          ctx,
          Math.round((width - cw) / 2),
          height - 26,
          cw,
          12,
          'rgba(10,12,16,0.55)',
          'rgba(168,176,112,0.4)',
        );
        drawUiTextCentered(ctx, caption, width / 2, height - 24, '#c8c0a0', 6.5, 500);
      }

      drawUiText(ctx, 'K — выход в квартиру', 4, height - 10, '#607080', 5, 500);
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    /** Capture / debug: jump to lights-out choices. */
    debugForceNight(): void {
      dialogue.resetSilent();
      phase = 'night';
      nightCursor = 0;
      spark.value = Math.max(spark.value, 0.35);
      syncHud();
    },

    /** Capture / debug: jump to closing card. */
    debugForceDone(): void {
      dialogue.resetSilent();
      finishNight(0);
    },

    /** Capture / debug: pin far-plate progress (0…1) or clear with null. */
    debugSetViewProgress(p: number | null): void {
      if (p === null || Number.isNaN(p)) {
        debugViewProgress = null;
        return;
      }
      debugViewProgress = Math.max(0, Math.min(1, p));
    },
  };
}
