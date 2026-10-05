import { audio } from '@/audio';
/**
 * ERA_1995 — Level 3 “Вокзал” (snowy platform / waiting hall, Winter 1995).
 * Wave 1 → timed money/bag dialogue → Wave 2 + parcel retrieve → clear.
 */

import type { StateManager } from '@/core/StateManager';
import { effectShake } from '@/core/Settings';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { VOKZAL_PAL } from '@/art/segaPalette';
import { ditherRect, px, speckles } from '@/art/pixelDraw';
import { drawSnappedSnow } from '@/art/snowParticles';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import {
  drawVokzalFilmPoster,
  preloadVokzalPosters,
} from '@/art/vokzalPosters';
import { ParallaxStack } from '@/render/ParallaxLayer';
import {
  applyLightingOverlay,
  type PointLight,
} from '@/render/LightingOverlay';
import {
  DialogueSystem,
  VOKZAL_PLATFORM_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';
import { QuizSystem, quizHudHint } from '@/systems/QuizSystem';
import { tickQuizEncounter } from '@/systems/quizEncounter';
import { GENERAL_PHILOSOPHY_QUESTIONS } from '@/data/philosophyQuestions';

const P = VOKZAL_PAL;
const WORLD_W = 560;
const FLOOR_Y = 188;
const WRONG_REASSURE_MF_DRAIN = 22;
const RELATIVE_X = 310;

type LevelPhase = 'wave1' | 'dialogue' | 'wave2' | 'cleared' | 'gameover';

interface ParcelPickup {
  x: number;
  y: number;
  taken: boolean;
}

export interface VokzalSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: TeaSystem;
}

export function createVokzal1995Scene(deps: VokzalSceneDeps) {
  const { states, player, hud, beer } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let relativeFear = 1;
  let hasParcel = false;
  let parcel: ParcelPickup | null = null;
  let winTimer = 0;
  let dialogueStarted = false;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  const bulbs: PointLight[] = [
    { kind: 'point', x: 90, y: 70, radius: 36, color: '#e8d080', phase: 0.3 },
    { kind: 'point', x: 260, y: 64, radius: 32, color: '#d8c070', phase: 1.2 },
    { kind: 'point', x: 430, y: 68, radius: 34, color: '#e0c868', phase: 2.1 },
  ];

  const spawnWave1 = (): void => {
    gangsters = [
      new Gangster({ x: 180, y: FLOOR_Y, hp: 32 }),
      new Gangster({ x: 250, y: FLOOR_Y, hp: 30 }),
      new Gangster({ x: 340, y: FLOOR_Y, hp: 34 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = relativeFear < 0.4 ? 0.82 : relativeFear > 0.8 ? 1.12 : 1;
    const hpBonus = relativeFear > 0.8 ? 4 : 0;
    gangsters = [
      new Gangster({
        x: 300,
        y: FLOOR_Y,
        hp: 36 + hpBonus,
        variant: 'tracksuit',
        carriesCoat: true,
      }),
      new Gangster({
        x: 380,
        y: FLOOR_Y,
        hp: 34 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 450,
        y: FLOOR_Y,
        hp: 38 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) g.speedMul = speedMul;
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Защити тётю на перроне';
    if (phase === 'dialogue') return 'Разговор - сумка, таймер';
    if (phase === 'wave2') {
      if (!hasParcel) return 'Забери посылку + зачисти';
      return 'Добей гопников';
    }
    if (phase === 'cleared') return 'УР. 3 ПРОЙДЕН';
    return 'ПЕРЕДЫШКА…';
  };

  const syncHud = (objective?: string): void => {
    hud.set({
      hp: player.hp,
      maxHp: MAX_FORTITUDE,
      fortitude: player.mentalFortitude,
      maxFortitude: MAX_FORTITUDE,
      swagger: player.streetSwagger,
      maxSwagger: MAX_SWAGGER,
      showSwagger: true,
      eraLabel: 'ЗУИЧ · 1995',
      levelTitle: 'Вокзал',
      objective: objective ?? objectiveForPhase(),
    });
  };

  const clearCombatAndReturn = (): void => {
    gangsters = [];
    phase = 'gameover';
    gameOverTimer = 0;
    if (dialogue.isOpen) dialogue.close();
    player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
    states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.55 });
  };

  const nearRelative = (): boolean =>
    Math.abs(player.x - RELATIVE_X) < 48;

  const beginDialogue = (): void => {
    if (dialogueStarted || dialogue.isOpen) return;
    dialogueStarted = true;
    quiz.closeSilent();
    phase = 'dialogue';
    gangsters = [];
    player.vx = 0;
    toast = 'СУМКА / ДЕНЬГИ';
    toastTimer = 1.2;
    dialogue.open(VOKZAL_PLATFORM_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_relative') {
      relativeFear = 0.25;
      toast = 'ТЁТЯ ДЕРЖИТСЯ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      relativeFear = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - СТРАХ' : 'ПУСТЫЕ СЛОВА - СД';
      toastTimer = 1.6;
    } else {
      relativeFear = 0.7;
    }

    if (player.isKo) {
      phase = 'gameover';
      gameOverTimer = 1.8;
      syncHud('ПЕРЕДЫШКА…');
      return;
    }

    phase = 'wave2';
    hasParcel = false;
    parcel = null;
    spawnWave2();
    syncHud();
  };

  const drawGameplayLayer = (
    ctx: CanvasRenderingContext2D,
    _scroll: number,
    _cam: number,
    _viewW: number,
    viewH: number,
    alpha: number,
  ): void => {
    drawVokzalWorld(ctx, WORLD_W, viewH, time);
    drawRelative(ctx, RELATIVE_X, FLOOR_Y, relativeFear);
    if (parcel && !parcel.taken) drawParcel(ctx, parcel.x, parcel.y);
    for (const g of gangsters) g.render(ctx, alpha);
    player.render(ctx, alpha);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number): void => {
    stack.setLayers([
      {
        id: 'sky_trains',
        speedRatio: 0.1,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => drawTrainSilhouettes(ctx, w, h, scroll, time),
      },
      {
        id: 'gameplay',
        speedRatio: 1,
        zIndex: 20,
        draw: (ctx, scroll, cam, w, h) => drawGameplayLayer(ctx, scroll, cam, w, h, alpha),
      },
      {
        id: 'lighting',
        speedRatio: 0,
        zIndex: 40,
        screenSpace: true,
        draw: (ctx, _s, cam, w, h) => {
          applyLightingOverlay(
            ctx,
            cam,
            w,
            h,
            {
              ambient: { color: 'rgba(24, 28, 40, 0.55)' },
              points: bulbs,
              cones: [],
              time,
            },
          );
        },
      },
      {
        id: 'snow',
        speedRatio: 0.85,
        zIndex: 50,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) =>
          drawSnappedSnow(ctx, w, h, scroll, time, {
            hi: P.snow,
            mid: P.snow,
            lo: P.snowMid,
          }, 28),
      },
    ]);
  };

  return {
    enter(): void {
      audio.playTheme('station');
      beer.pauseForFlashback();
      preloadVokzalPosters();
      player.setEra('teen');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = 50;
      player.setFloorY(FLOOR_Y);
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 58;
      camX = 0;
      phase = 'wave1';
      gameOverTimer = 0;
      toast = '';
      toastTimer = 0;
      time = 0;
      shake = 0;
      relativeFear = 1;
      hasParcel = false;
      parcel = null;
      winTimer = 0;
      dialogueStarted = false;
      dialogue.resetSilent();
      quiz.closeSilent();
      spawnWave1();
      syncHud();
    },

    exit(): void {
      gangsters = [];
        dialogue.resetSilent();
      quiz.closeSilent();
      hud.set({ showSwagger: false });
    },

    update(dt: number): void {
      time += dt;
      if (shake > 0) shake = Math.max(0, shake - dt);
      if (player.bazarShake > 0) shake = Math.max(shake, player.bazarShake);

      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toast = '';
      }

      if (phase === 'dialogue' && dialogue.isOpen) {
        dialogue.update(dt);
        player.update(dt);
        const input = states.input;
        if (input) {
          if (dialogue.hasChoices) {
            if (input.justPressed('choice1')) {
              dialogue.selectChoice(0);
            } else if (input.justPressed('choice2')) {
              dialogue.selectChoice(1);
            }
          } else if (
            input.justPressed('confirm') ||
            input.justPressed('interact')
          ) {
            dialogue.advance();
          }
        }
        syncHud();
        camFollow(dt);
        return;
      }

      if (phase === 'gameover') {
        gameOverTimer -= dt;
        player.update(dt);
        if (gameOverTimer <= 0) clearCombatAndReturn();
        syncHud('ПЕРЕДЫШКА…');
        return;
      }

      if (phase === 'cleared') {
        winTimer -= dt;
        player.update(dt);
        syncHud('УР. 3 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level3Cleared', true);
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.65 });
        }
        return;
      }

      player.update(dt);
      const input = states.input;

      // Philosophy quiz replaces punch/kick/bazar
      if ((phase === 'wave1' || phase === 'wave2') && !player.isKo) {
        const qres = tickQuizEncounter({
          quiz,
          input,
          player,
          gangsters,
          dt,
          autoOpen: true,
          swaggerOnCorrect: 14,
        });
        if (qres.toast) {
          toast = qres.toast;
          toastTimer = qres.toastTimer;
        }
      } else {
        quiz.update(dt);
      }

      if (input && !player.isKo && !quiz.isOpen) {
        if (input.justPressed('jump')) player.tryJump();
        player.applyWalk(input.axisX(), dt, 16, WORLD_W - 16);
      }

      player.applyPhysics(dt, 16, WORLD_W - 16);

      for (const g of gangsters) {
        g.update(dt, player.x, player.y, FLOOR_Y, 40, WORLD_W - 20);
        const drop = g.consumeCoatDrop();
        if (drop && !parcel) {
          parcel = { x: drop.x, y: drop.y, taken: false };
        }
      }

      if (parcel && !parcel.taken && !hasParcel) {
        if (Math.abs(player.x - parcel.x) < 16 && Math.abs(player.y - parcel.y) < 20) {
          parcel.taken = true;
          hasParcel = true;
          toast = 'ПОСЫЛКА ВЗЯТА';
          toastTimer = 1.2;
        }
      }

      if (player.isKo) {
        phase = 'gameover';
        gameOverTimer = 1.8;
        quiz.closeSilent();
        toast = 'СИЛА ДУХА СЛОМЛЕНА';
        toastTimer = 1.8;
      }

      const alive = gangsters.filter((g) => !g.isKo).length;

      if (phase === 'wave1' && !dialogueStarted && !quiz.isOpen) {
        const anyKo = gangsters.some((g) => g.isKo);
        if (alive === 0 || (nearRelative() && anyKo)) {
          beginDialogue();
        } else {
          syncHud(`Волна 1 · Вопросы ${alive}`);
        }
      } else if (phase === 'wave2' && !quiz.isOpen) {
        if (alive === 0 && hasParcel) {
          phase = 'cleared';
          winTimer = 2.4;
          toast = 'ПОСЫЛКА СПАСЕНА';
          toastTimer = 2.4;
          syncHud('УР. 3 ПРОЙДЕН');
        } else {
          syncHud();
        }
      }

      camFollow(dt);
    },

    render(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      _ctx: unknown,
      width: number,
      height: number,
    ): void {
      const shakeMul = effectShake(1);
      const shakeX = shake > 0 ? Math.round(Math.sin(time * 55) * 3 * (shake / 0.28) * shakeMul) : 0;
      const shakeY = shake > 0 ? Math.round(Math.cos(time * 47) * 2 * (shake / 0.28) * shakeMul) : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);
      rebuildStack(alpha);
      stack.render(ctx, camX, width, height);
      ctx.restore();

      if (phase === 'dialogue' && dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      } else if (quiz.isOpen) {
        quiz.render(ctx, width, height);
      } else {
        const hint = quiz.isOpen ? '' : quizHudHint();
        const hw = measureUiText(ctx, hint, 6.5, 500) + 10;
        uiPanel(ctx, 4, height - 14, Math.min(hw, width - 8), 11, 'rgba(10,12,18,0.72)', 'rgba(120,100,60,0.45)');
        drawUiText(ctx, hint, 8, height - 11, P.uiBorder, 6.5, 500);
      }

      if (phase === 'wave2') {
        const status = hasParcel ? 'ПОСЫЛКА: ДА' : parcel ? 'ПОСЫЛКА: УПАЛА' : 'ПОСЫЛКА: УКРАДЕНА';
        const sw = measureUiText(ctx, status, 6.5, 550) + 8;
        uiPanel(
          ctx,
          width - sw - 4,
          36,
          sw,
          11,
          'rgba(12,14,20,0.85)',
          hasParcel ? 'rgba(64,200,120,0.7)' : 'rgba(224,112,64,0.7)',
        );
        drawUiText(ctx, status, width - sw, 38, hasParcel ? '#a0f0c0' : '#f0c0a0', 6.5, 550);
      }

      if (toast) {
        const tw2 = measureUiText(ctx, toast, 7, 600) + 14;
        uiPanel(
          ctx,
          Math.round((width - tw2) / 2),
          36,
          tw2,
          13,
          'rgba(32,16,24,0.88)',
          'rgba(240,192,64,0.7)',
        );
        drawUiTextCentered(ctx, toast, width / 2, 39, '#f8f0d0', 7, 600);
      }

      if (phase === 'gameover') {
        ctx.fillStyle = 'rgba(8, 4, 8, 0.55)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Передышка…', width / 2, height / 2 - 16, '#d8d0c0', 12, 700);
        drawUiTextCentered(ctx, 'Назад в 2026', width / 2, height / 2 + 2, '#a8a090', 7, 500);
      }

      if (phase === 'cleared') {
        ctx.fillStyle = 'rgba(4, 12, 8, 0.45)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Ур. 3 пройден', width / 2, height / 2 - 16, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Посылка у тёти', width / 2, height / 2 + 4, P.uiText, 7, 500);
      }
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    getQuiz(): QuizSystem {
      return quiz;
    },

    __debug: {
      getPhase: () => phase,
      forceDialogue: () => beginDialogue(),
      skipToChoices: () => {
        if (!dialogue.isOpen) beginDialogue();
        dialogue.advance();
        dialogue.advance();
        dialogue.advance();
      },
      /** Open general philosophy bank by index (era-tagged L3+ deck). */
      forcePhilosophyQuiz: (index = 0) => {
        dialogue.resetSilent();
        quiz.openFromBank('Прохожий', GENERAL_PHILOSOPHY_QUESTIONS, index);
      },
      forceClear: () => {
        phase = 'cleared';
        winTimer = 0.4;
        hasParcel = true;
        states.setFlag('level3Cleared', true);
      },
      giveParcel: () => {
        hasParcel = true;
        if (parcel) parcel.taken = true;
      },
    },
  };

  function camFollow(dt: number): void {
    const target = player.x - 120;
    camX += (target - camX) * Math.min(1, dt * 6);
    if (camX < 0) camX = 0;
    if (camX > WORLD_W - LOGICAL_WIDTH) camX = WORLD_W - LOGICAL_WIDTH;
  }
}

/* ───────────────────── Environment ───────────────────── */

function drawTrainSilhouettes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
  time: number,
): void {
  px(ctx, 0, 0, width, height, P.skyTop);
  ditherRect(ctx, 0, 0, width, 80, P.skyTop, P.skyMid);
  px(ctx, 0, 90, width, 50, P.skyLow);
  const ox = Math.round(scroll * 0.15 + time * 8);
  for (let i = -1; i < 3; i++) {
    const tx = i * 180 - (ox % 180);
    px(ctx, tx, 78, 140, 36, P.train);
    px(ctx, tx + 4, 74, 132, 6, P.trainHi);
    for (let w = 0; w < 5; w++) {
      px(ctx, tx + 12 + w * 24, 86, 14, 10, P.trainWin);
    }
    px(ctx, tx - 8, 100, 16, 12, P.train);
  }
}

function drawVokzalWorld(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  height: number,
  time: number,
): void {
  // Waiting hall strip — solid wall panels leave room for film posters
  px(ctx, 40, 40, 220, 100, P.hallDark);
  px(ctx, 44, 44, 212, 70, P.hall);
  // Narrow glass strips between poster bays
  px(ctx, 50, 50, 18, 40, P.glass);
  px(ctx, 148, 50, 18, 40, P.glassHi);
  px(ctx, 230, 50, 18, 40, P.glass);
  speckles(ctx, 44, 44, 212, 70, P.hallHi, 18, 3);
  // Sign
  px(ctx, 90, 28, 70, 14, P.sign);
  px(ctx, 92, 30, 66, 10, '#a03030');

  // Mid / far platform wall bays for more posters
  px(ctx, 300, 48, 100, 88, P.hallDark);
  px(ctx, 304, 52, 92, 60, P.hall);
  speckles(ctx, 304, 52, 92, 60, P.hallHi, 10, 4);
  px(ctx, 430, 44, 110, 92, P.hallDark);
  px(ctx, 434, 48, 102, 64, P.hall);
  speckles(ctx, 434, 48, 102, 64, P.hallHi, 12, 5);

  // «Вокзал для двоих» — large photo posters on station walls
  drawVokzalFilmPoster(ctx, 'gurchenko', 72, 48, 68, 100);
  drawVokzalFilmPoster(ctx, 'official', 170, 46, 56, 86);
  drawVokzalFilmPoster(ctx, 'snow', 312, 56, 84, 56);
  drawVokzalFilmPoster(ctx, 'official', 442, 52, 52, 80);
  drawVokzalFilmPoster(ctx, 'gurchenko', 500, 58, 40, 60);

  // Platform
  px(ctx, 0, FLOOR_Y, worldW, height - FLOOR_Y, P.platformDark);
  px(ctx, 0, FLOOR_Y, worldW, 8, P.platform);
  px(ctx, 0, FLOOR_Y + 2, worldW, 3, P.platformHi);
  // Rails
  for (let x = 0; x < worldW; x += 24) {
    px(ctx, x, FLOOR_Y + 18, 18, 2, P.rail);
    px(ctx, x + 6, FLOOR_Y + 14, 2, 10, P.railHi);
  }
  // Snow on platform edge
  px(ctx, 0, FLOOR_Y - 3, worldW, 3, P.snowMid);
  speckles(ctx, 0, FLOOR_Y - 4, worldW, 6, P.snow, 40, 1);

  // Luggage piles
  drawLuggage(ctx, 70, FLOOR_Y);
  drawLuggage(ctx, 420, FLOOR_Y);
  drawBench(ctx, 200, FLOOR_Y);
  drawBench(ctx, 480, FLOOR_Y);

  // Dim hanging bulbs
  const pulse = 0.7 + 0.3 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(240,220,140,${(0.15 * pulse).toFixed(2)})`;
  ctx.beginPath();
  ctx.arc(90, 70, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawLuggage(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 14, 18, 14, P.luggage);
  px(ctx, x + 2, floorY - 12, 14, 4, P.luggageHi);
  px(ctx, x + 1, floorY - 14, 16, 2, P.luggageDark);
  px(ctx, x + 20, floorY - 10, 12, 10, P.luggageDark);
  px(ctx, x + 22, floorY - 8, 8, 3, P.luggageHi);
}

function drawBench(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 12, 40, 4, P.benchHi);
  px(ctx, x + 2, floorY - 8, 3, 8, P.bench);
  px(ctx, x + 35, floorY - 8, 3, 8, P.bench);
}

function drawRelative(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  fear: number,
): void {
  const ox = Math.round(x);
  const oy = Math.round(floorY);
  // Coat + headscarf relative
  px(ctx, ox - 5, oy - 22, 10, 14, '#6a4850');
  px(ctx, ox - 4, oy - 20, 8, 4, '#8a6870');
  px(ctx, ox - 4, oy - 28, 8, 7, '#d0a878');
  px(ctx, ox - 5, oy - 30, 10, 4, '#c8a060');
  px(ctx, ox - 3, oy - 26, 2, 2, '#1a1420');
  px(ctx, ox + 1, oy - 26, 2, 2, '#1a1420');
  if (fear > 0.6) {
    px(ctx, ox + 6, oy - 32, 3, 3, '#f0e0a0');
  }
}

function drawParcel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  px(ctx, ox - 7, oy - 8, 14, 10, '#8a6848');
  px(ctx, ox - 6, oy - 7, 12, 3, '#b09068');
  px(ctx, ox - 1, oy - 8, 2, 10, '#c8a050');
  px(ctx, ox - 7, oy - 4, 14, 1, '#c8a050');
}

