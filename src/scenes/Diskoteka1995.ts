/**
 * ERA_1995 — Level 7 “Дискотека «Орбита»” (neon club, Winter 1995).
 * Wave 1 at entrance → timed bouncer dialogue → Wave 2 on floor + cassette → clear.
 */

import type { StateManager } from '@/core/StateManager';
import { effectShake } from '@/core/Settings';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { DISKO_PAL } from '@/art/segaPalette';
import { ditherRect, px, speckles } from '@/art/pixelDraw';
import {
  drawDiscoHallBackdrop,
  discoHallViewsReady,
  discoViewCaption,
  preloadDiscoHallViews,
} from '@/art/discoHallViews';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import { ParallaxStack } from '@/render/ParallaxLayer';
import {
  applyLightingOverlay,
  type PointLight,
} from '@/render/LightingOverlay';
import {
  DialogueSystem,
  DISKO_CLUB_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';
import { QuizSystem, quizHudHint } from '@/systems/QuizSystem';
import { tickQuizEncounter } from '@/systems/quizEncounter';

const P = DISKO_PAL;
const WORLD_W = 540;
const FLOOR_Y = 192;
const WRONG_REASSURE_MF_DRAIN = 22;

type LevelPhase = 'wave1' | 'dialogue' | 'wave2' | 'cleared' | 'gameover';

interface CassettePickup {
  x: number;
  y: number;
  taken: boolean;
}

export interface DiskotekaSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: TeaSystem;
}

export function createDiskoteka1995Scene(deps: DiskotekaSceneDeps) {
  const { states, player, hud, beer } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let clubHeat = 1;
  let hasCassette = false;
  let cassette: CassettePickup | null = null;
  let winTimer = 0;
  let dialogueStarted = false;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  const bulbs: PointLight[] = [
    { kind: 'point', x: 70, y: 80, radius: 30, color: '#e84898', phase: 0.2 },
    { kind: 'point', x: 180, y: 70, radius: 28, color: '#48e8e0', phase: 1.0 },
    { kind: 'point', x: 300, y: 76, radius: 32, color: '#9848e8', phase: 1.8 },
    { kind: 'point', x: 420, y: 72, radius: 30, color: '#e8d048', phase: 2.6 },
  ];

  const spawnWave1 = (): void => {
    gangsters = [
      new Gangster({ x: 150, y: FLOOR_Y, hp: 34 }),
      new Gangster({ x: 230, y: FLOOR_Y, hp: 36 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = clubHeat < 0.4 ? 0.84 : clubHeat > 0.8 ? 1.2 : 1.05;
    const hpBonus = clubHeat > 0.8 ? 8 : 0;
    gangsters = [
      new Gangster({
        x: 260,
        y: FLOOR_Y,
        hp: 40 + hpBonus,
        variant: 'tracksuit',
        carriesCoat: true,
      }),
      new Gangster({
        x: 340,
        y: FLOOR_Y,
        hp: 38 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 420,
        y: FLOOR_Y,
        hp: 42 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) g.speedMul = speedMul;
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Пробей вход в «Орбиту»';
    if (phase === 'dialogue') return 'Вышибала - выбор, таймер';
    if (phase === 'wave2') {
      if (!hasCassette) return 'Забери кассету + зачисти';
      return 'Добей на танцполе';
    }
    if (phase === 'cleared') return 'УР. 7 ПРОЙДЕН';
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
      levelTitle: 'Дискотека «Орбита»',
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

  const beginDialogue = (): void => {
    if (dialogueStarted || dialogue.isOpen) return;
    dialogueStarted = true;
    quiz.closeSilent();
    phase = 'dialogue';
    gangsters = [];
    player.vx = 0;
    toast = 'НЕОН И ДЫМ';
    toastTimer = 1.2;
    dialogue.open(DISKO_CLUB_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_disco') {
      clubHeat = 0.25;
      toast = 'НА ТАНЦПОЛ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      clubHeat = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - СД' : 'СЛАБО - СД';
      toastTimer = 1.6;
    } else {
      clubHeat = 0.7;
    }

    if (player.isKo) {
      phase = 'gameover';
      gameOverTimer = 1.8;
      syncHud('ПЕРЕДЫШКА…');
      return;
    }

    phase = 'wave2';
    hasCassette = false;
    cassette = null;
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
    drawDiskoWorld(ctx, WORLD_W, viewH, time);
    if (cassette && !cassette.taken) drawCassette(ctx, cassette.x, cassette.y);
    for (const g of gangsters) g.render(ctx, alpha);
    player.render(ctx, alpha);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number): void => {
    const progress =
      WORLD_W > LOGICAL_WIDTH ? camX / (WORLD_W - LOGICAL_WIDTH) : 0;
    stack.setLayers([
      {
        id: 'club',
        speedRatio: 0.05,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => {
          if (discoHallViewsReady()) {
            drawDiscoHallBackdrop(ctx, w, h, progress, time);
          } else {
            drawClubBack(ctx, w, h, scroll, time);
          }
        },
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
              ambient: {
                color: discoHallViewsReady()
                  ? 'rgba(20, 8, 28, 0.38)'
                  : 'rgba(20, 8, 28, 0.58)',
              },
              points: bulbs,
              cones: [],
              time,
            },
          );
        },
      },
    ]);
  };

  return {
    enter(): void {
      beer.pauseForFlashback();
      preloadDiscoHallViews();
      player.setEra('teen');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = 40;
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
      clubHeat = 1;
      hasCassette = false;
      cassette = null;
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
        syncHud('УР. 7 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level7Cleared', true);
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
        if (drop && !cassette) {
          cassette = { x: drop.x, y: drop.y, taken: false };
        }
      }

      if (cassette && !cassette.taken && !hasCassette) {
        if (Math.abs(player.x - cassette.x) < 16 && Math.abs(player.y - cassette.y) < 20) {
          cassette.taken = true;
          hasCassette = true;
          toast = 'КАССЕТА СТАРШЕГО';
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
        if (alive === 0) {
          beginDialogue();
        } else {
          syncHud(`Волна 1 · Вопросы ${alive}`);
        }
      } else if (phase === 'wave2' && !quiz.isOpen) {
        if (alive === 0 && hasCassette) {
          phase = 'cleared';
          winTimer = 2.4;
          toast = 'КАССЕТА У ТЕБЯ';
          toastTimer = 2.4;
          syncHud('УР. 7 ПРОЙДЕН');
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
        uiPanel(ctx, 4, height - 14, Math.min(hw, width - 8), 11, 'rgba(16,8,24,0.78)', 'rgba(232,72,152,0.45)');
        drawUiText(ctx, hint, 8, height - 11, P.uiBorder, 6.5, 500);
      }

      if (phase === 'wave2') {
        const status = hasCassette ? 'КАССЕТА: ДА' : cassette ? 'КАССЕТА: УПАЛА' : 'КАССЕТА: УКРАДЕНА';
        const sw = measureUiText(ctx, status, 6.5, 550) + 8;
        uiPanel(
          ctx,
          width - sw - 4,
          36,
          sw,
          11,
          'rgba(12,8,20,0.85)',
          hasCassette ? 'rgba(64,200,120,0.7)' : 'rgba(232,72,152,0.7)',
        );
        drawUiText(ctx, status, width - sw, 38, hasCassette ? '#a0f0c0' : '#f0c0d8', 6.5, 550);
      }

      if (toast) {
        const tw2 = measureUiText(ctx, toast, 7, 600) + 14;
        uiPanel(
          ctx,
          Math.round((width - tw2) / 2),
          36,
          tw2,
          13,
          'rgba(28,12,36,0.9)',
          'rgba(72,232,224,0.65)',
        );
        drawUiTextCentered(ctx, toast, width / 2, 39, '#f8f0ff', 7, 600);
      } else if (
        discoHallViewsReady() &&
        (phase === 'wave1' || phase === 'wave2' || phase === 'cleared')
      ) {
        const progress =
          WORLD_W > LOGICAL_WIDTH ? camX / (WORLD_W - LOGICAL_WIDTH) : 0;
        const caption = discoViewCaption(progress);
        const cw = measureUiText(ctx, caption, 6.5, 500) + 10;
        uiPanel(
          ctx,
          Math.round((width - cw) / 2),
          height - 28,
          cw,
          11,
          'rgba(16,8,24,0.55)',
          'rgba(232,72,152,0.35)',
        );
        drawUiTextCentered(ctx, caption, width / 2, height - 25, '#d0b0e0', 6.5, 500);
      }

      if (phase === 'gameover') {
        ctx.fillStyle = 'rgba(8, 4, 12, 0.55)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Передышка…', width / 2, height / 2 - 16, '#d8d0c0', 12, 700);
        drawUiTextCentered(ctx, 'Назад в 2026', width / 2, height / 2 + 2, '#a8a090', 7, 500);
      }

      if (phase === 'cleared') {
        ctx.fillStyle = 'rgba(8, 4, 16, 0.45)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Ур. 7 пройден', width / 2, height / 2 - 16, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, '«Орбита» затихла. Кассета твоя', width / 2, height / 2 + 4, P.uiText, 7, 500);
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
      },
      giveCassette: () => {
        hasCassette = true;
        if (cassette) cassette.taken = true;
      },
      forceClear: () => {
        phase = 'cleared';
        winTimer = 0.4;
        hasCassette = true;
        states.setFlag('level7Cleared', true);
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

function drawClubBack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
  time: number,
): void {
  px(ctx, 0, 0, width, height, P.skyTop);
  ditherRect(ctx, 0, 0, width, 80, P.skyTop, P.skyMid);
  px(ctx, 0, 90, width, 40, P.skyLow);
  const ox = Math.round(scroll * 0.08);
  // Neon sign fragments
  const neon = Math.sin(time * 6) > 0 ? P.neonPink : P.neonCyan;
  px(ctx, 40 - (ox % 40), 30, 60, 6, neon);
  px(ctx, 140 - (ox % 40), 44, 50, 5, P.neonViolet);
  px(ctx, 220 - (ox % 40), 28, 40, 6, P.neonYellow);
}

function drawDiskoWorld(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  height: number,
  time: number,
): void {
  const plates = discoHallViewsReady();

  // Checker dance floor (gameplay-readable; plates show above)
  px(ctx, 0, FLOOR_Y, worldW, height - FLOOR_Y, P.floorDark);
  for (let x = 0; x < worldW; x += 16) {
    for (let y = 0; y < 4; y++) {
      const lite = (x / 16 + y) % 2 === 0;
      px(ctx, x, FLOOR_Y + y * 8, 16, 8, lite ? P.floorLite : P.floorDark);
    }
  }
  px(ctx, 0, FLOOR_Y, worldW, 2, P.floorHi);

  if (!plates) {
    // Procedural back wall + neon strips (fallback)
    px(ctx, 0, 40, worldW, FLOOR_Y - 40, P.wall);
    ditherRect(ctx, 0, 40, worldW, 40, P.wallDark, P.wall);
    const pulse = Math.sin(time * 5);
    px(ctx, 20, 50, worldW - 40, 3, pulse > 0 ? P.neonPink : P.neonCyan);
    px(ctx, 40, 70, worldW - 80, 2, pulse > 0.3 ? P.neonYellow : P.neonViolet);
    px(ctx, 200, 48, 80, 16, P.wallDark);
    px(ctx, 202, 50, 76, 12, Math.sin(time * 4) > 0 ? P.neonPink : P.neonViolet);
  } else {
    // Thin floor-to-wall blend so plates meet the checkers cleanly
    ditherRect(ctx, 0, FLOOR_Y - 14, worldW, 14, P.wallDark, P.floorDark);
    px(ctx, 0, FLOOR_Y - 2, worldW, 2, P.wallDark);
  }

  // Speakers
  drawSpeaker(ctx, 30, FLOOR_Y);
  drawSpeaker(ctx, worldW - 54, FLOOR_Y);

  // Mirror ball
  const bx = Math.round(worldW / 2);
  const by = 58 + Math.round(Math.sin(time * 2) * 2);
  px(ctx, bx - 1, 40, 2, by - 40, '#687078');
  ctx.fillStyle = P.ball;
  ctx.beginPath();
  ctx.arc(bx, by, 12, 0, Math.PI * 2);
  ctx.fill();
  speckles(ctx, bx - 10, by - 10, 20, 20, P.ballHi, 10, 1);
  px(ctx, bx - 4, by - 4, 4, 3, P.ballDark);

  // Bar counter left
  px(ctx, 80, FLOOR_Y - 28, 70, 28, P.bar);
  px(ctx, 82, FLOOR_Y - 26, 66, 4, P.barHi);
  px(ctx, 90, FLOOR_Y - 40, 8, 12, P.neonCyan);
  px(ctx, 110, FLOOR_Y - 38, 6, 10, P.neonPink);
}

function drawSpeaker(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 50, 24, 50, P.speaker);
  px(ctx, x + 2, floorY - 48, 20, 46, P.speakerHi);
  ctx.fillStyle = P.speakerCone;
  ctx.beginPath();
  ctx.arc(x + 12, floorY - 34, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, floorY - 16, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCassette(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  px(ctx, ox - 9, oy - 8, 18, 10, P.cassette);
  px(ctx, ox - 7, oy - 6, 14, 6, P.cassetteHi);
  px(ctx, ox - 5, oy - 4, 4, 3, P.cassetteWin);
  px(ctx, ox + 1, oy - 4, 4, 3, P.cassetteWin);
  px(ctx, ox - 8, oy - 8, 16, 1, P.neonCyan);
}
