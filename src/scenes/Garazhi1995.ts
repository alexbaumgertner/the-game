import { audio } from '@/audio';
/**
 * ERA_1995 — Level 4 “Гаражи” (garage row / metal boxes, Winter 1995).
 * Wave 1 → timed крыша dialogue (MF branch) → Wave 2 + reclaim crate → clear.
 */

import type { StateManager } from '@/core/StateManager';
import { effectShake } from '@/core/Settings';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { GARAZHI_PAL } from '@/art/segaPalette';
import {
  drawGarazhiGraffiti,
  preloadGarazhiGraffiti,
} from '@/art/garazhiGraffiti';
import { ditherRect, px, speckles, woodGrain } from '@/art/pixelDraw';
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
  GARAZHI_ROOF_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';
import { QuizSystem, quizHudHint } from '@/systems/QuizSystem';
import { tickQuizEncounter } from '@/systems/quizEncounter';

const P = GARAZHI_PAL;
const WORLD_W = 540;
const FLOOR_Y = 192;
const WRONG_REASSURE_MF_DRAIN = 22;
const CRATE_SPOT_X = 400;

type LevelPhase = 'wave1' | 'dialogue' | 'wave2' | 'cleared' | 'gameover';

interface CratePickup {
  x: number;
  y: number;
  taken: boolean;
}

export interface GarazhiSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: TeaSystem;
}

export function createGarazhi1995Scene(deps: GarazhiSceneDeps) {
  const { states, player, hud, beer } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let roofPressure = 1;
  let hasCrate = false;
  let crate: CratePickup | null = null;
  let winTimer = 0;
  let dialogueStarted = false;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  const bulbs: PointLight[] = [
    { kind: 'point', x: 60, y: 88, radius: 22, color: '#e8c868', phase: 0.4 },
    { kind: 'point', x: 180, y: 82, radius: 20, color: '#d0a848', phase: 1.5 },
    { kind: 'point', x: 300, y: 90, radius: 24, color: '#e0b858', phase: 2.4 },
    { kind: 'point', x: 420, y: 86, radius: 22, color: '#c89840', phase: 0.9 },
  ];

  const spawnWave1 = (): void => {
    gangsters = [
      new Gangster({ x: 160, y: FLOOR_Y, hp: 34 }),
      new Gangster({ x: 240, y: FLOOR_Y, hp: 32 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = roofPressure < 0.4 ? 0.8 : roofPressure > 0.8 ? 1.18 : 1;
    const hpBonus = roofPressure > 0.8 ? 6 : 0;
    gangsters = [
      new Gangster({
        x: 280,
        y: FLOOR_Y,
        hp: 38 + hpBonus,
        variant: 'tracksuit',
        carriesCoat: true,
      }),
      new Gangster({
        x: 360,
        y: FLOOR_Y,
        hp: 36 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 440,
        y: FLOOR_Y,
        hp: 40 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) g.speedMul = speedMul;
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Зачисти ряд гаражей';
    if (phase === 'dialogue') return 'Крыша - выбор, таймер';
    if (phase === 'wave2') {
      if (!hasCrate) return 'Верни ящик отца + зачисти';
      return 'Добей гопников';
    }
    if (phase === 'cleared') return 'УР. 4 ПРОЙДЕН';
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
      levelTitle: 'Гаражи',
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
    toast = 'КРЫША ТРЕБУЕТ';
    toastTimer = 1.2;
    dialogue.open(GARAZHI_ROOF_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_goods') {
      roofPressure = 0.25;
      toast = 'ЯЩИК НАШ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      roofPressure = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - СД' : 'ПРОЦЕНТ? - СД';
      toastTimer = 1.6;
    } else {
      roofPressure = 0.7;
    }

    if (player.isKo) {
      phase = 'gameover';
      gameOverTimer = 1.8;
      syncHud('ПЕРЕДЫШКА…');
      return;
    }

    phase = 'wave2';
    hasCrate = false;
    crate = null;
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
    drawGarazhiWorld(ctx, WORLD_W, viewH, time);
    if (crate && !crate.taken) drawCrate(ctx, crate.x, crate.y);
    else if (!hasCrate && phase !== 'wave2') drawCrate(ctx, CRATE_SPOT_X, FLOOR_Y - 6);
    for (const g of gangsters) g.render(ctx, alpha);
    player.render(ctx, alpha);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number): void => {
    stack.setLayers([
      {
        id: 'night',
        speedRatio: 0.06,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => drawNightYard(ctx, w, h, scroll),
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
              ambient: { color: 'rgba(16, 14, 20, 0.62)' },
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
      audio.playTheme('garages');
      beer.pauseForFlashback();
      preloadGarazhiGraffiti();
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
      roofPressure = 1;
      hasCrate = false;
      crate = null;
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
        syncHud('УР. 4 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level4Cleared', true);
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
        if (drop && !crate) {
          crate = { x: drop.x, y: drop.y, taken: false };
        }
      }

      if (crate && !crate.taken && !hasCrate) {
        if (Math.abs(player.x - crate.x) < 16 && Math.abs(player.y - crate.y) < 20) {
          crate.taken = true;
          hasCrate = true;
          toast = 'ЯЩИК ОТЦА';
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
        if (alive === 0 && hasCrate) {
          phase = 'cleared';
          winTimer = 2.4;
          toast = 'ТОВАР ВЕРНУТ';
          toastTimer = 2.4;
          syncHud('УР. 4 ПРОЙДЕН');
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
        const status = hasCrate ? 'ЯЩИК: ДА' : crate ? 'ЯЩИК: УПАЛ' : 'ЯЩИК: УКРАДЕН';
        const sw = measureUiText(ctx, status, 6.5, 550) + 8;
        uiPanel(
          ctx,
          width - sw - 4,
          36,
          sw,
          11,
          'rgba(12,14,20,0.85)',
          hasCrate ? 'rgba(64,200,120,0.7)' : 'rgba(224,112,64,0.7)',
        );
        drawUiText(ctx, status, width - sw, 38, hasCrate ? '#a0f0c0' : '#f0c0a0', 6.5, 550);
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
        drawUiTextCentered(ctx, 'Ур. 4 пройден', width / 2, height / 2 - 16, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Товар отца спасён', width / 2, height / 2 + 4, P.uiText, 7, 500);
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
      },
      forceClear: () => {
        phase = 'cleared';
        winTimer = 0.4;
        hasCrate = true;
        states.setFlag('level4Cleared', true);
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

function drawNightYard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
): void {
  px(ctx, 0, 0, width, height, P.skyTop);
  ditherRect(ctx, 0, 0, width, 70, P.skyTop, P.skyMid);
  px(ctx, 0, 80, width, 40, P.skyLow);
  const ox = Math.round(scroll * 0.12);
  for (let i = -1; i < 5; i++) {
    const bx = i * 90 - (ox % 90);
    px(ctx, bx, 50, 40, 50, '#1a2030');
  }
}

function drawGarazhiWorld(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  height: number,
  time: number,
): void {
  px(ctx, 0, FLOOR_Y, worldW, height - FLOOR_Y, P.ground);
  px(ctx, 0, FLOOR_Y, worldW, 4, P.groundHi);
  speckles(ctx, 0, FLOOR_Y, worldW, 20, P.snowMid, 30, 1);

  for (let i = 0; i < 5; i++) {
    const gx = 20 + i * 100;
    drawGarageBox(ctx, gx, FLOOR_Y, i % 2 === 0);
    drawGarageGraffiti(ctx, gx, FLOOR_Y, i);
  }

  // Cars under tarps
  drawTarpCar(ctx, 70, FLOOR_Y);
  drawTarpCar(ctx, 270, FLOOR_Y);
  drawTarpCar(ctx, 470, FLOOR_Y);

  // Flicker wires / bulbs
  for (let i = 0; i < 4; i++) {
    const bx = 60 + i * 120;
    px(ctx, bx, 40, 1, 40, P.wire);
    const on = Math.sin(time * 4 + i) > -0.7;
    px(ctx, bx - 3, 78, 7, 6, on ? P.bulb : P.bulbDim);
  }
}

function drawGarageBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  openish: boolean,
): void {
  px(ctx, x, floorY - 70, 88, 70, P.metalDark);
  px(ctx, x + 2, floorY - 68, 84, 66, P.metal);
  speckles(ctx, x + 2, floorY - 68, 84, 66, P.metalHi, 12, 2);
  px(ctx, x + 4, floorY - 66, 80, 4, P.rust);
  // Door panels
  if (openish) {
    px(ctx, x + 8, floorY - 58, 36, 52, P.doorDark);
    px(ctx, x + 46, floorY - 58, 34, 52, P.door);
    px(ctx, x + 50, floorY - 40, 8, 3, P.doorHi);
  } else {
    px(ctx, x + 8, floorY - 58, 72, 52, P.door);
    for (let y = 0; y < 5; y++) {
      px(ctx, x + 12, floorY - 52 + y * 10, 64, 2, P.doorDark);
    }
    px(ctx, x + 70, floorY - 36, 6, 4, P.doorHi);
  }
  // Number plate
  px(ctx, x + 34, floorY - 64, 16, 8, '#2a2820');
  px(ctx, x + 36, floorY - 62, 12, 4, P.rustHi);
}

/** Large «Гараж» film stills wheatpasted on doors / side metal. */
function drawGarageGraffiti(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  index: number,
): void {
  // Door face sits at floorY-58..floorY-6, width ~72 (closed) / right leaf ~34 (openish).
  switch (index) {
    case 0:
      // Openish — big landscape plate on the closed leaf + overhang
      drawGarazhiGraffiti(ctx, 'gaftAkhedzhakova', x + 30, floorY - 54, 50, 38);
      drawGarazhiGraffiti(ctx, 'brondukov', x + 10, floorY - 52, 22, 28);
      break;
    case 1:
      drawGarazhiGraffiti(ctx, 'ryazanovHippo', x + 10, floorY - 56, 68, 44);
      break;
    case 2:
      drawGarazhiGraffiti(ctx, 'couple', x + 44, floorY - 56, 34, 46);
      drawGarazhiGraffiti(ctx, 'akhedzhakovaScarf', x + 10, floorY - 50, 28, 22);
      break;
    case 3:
      drawGarazhiGraffiti(ctx, 'nemolyaeva', x + 12, floorY - 56, 64, 44);
      break;
    case 4:
      drawGarazhiGraffiti(ctx, 'gaftMonkey', x + 10, floorY - 56, 68, 44);
      break;
    default:
      break;
  }
}

function drawTarpCar(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 18, 36, 14, P.car);
  px(ctx, x + 4, floorY - 22, 28, 8, P.tarp);
  px(ctx, x + 6, floorY - 20, 24, 4, P.tarpHi);
  px(ctx, x + 2, floorY - 16, 8, 4, P.tarpDark);
  px(ctx, x + 26, floorY - 16, 8, 4, P.tarpDark);
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  woodGrain(ctx, ox - 8, oy - 12, 16, 12, P.crate, P.crateHi, P.crate, P.crateDark);
  px(ctx, ox - 8, oy - 12, 16, 2, P.crateDark);
  px(ctx, ox - 1, oy - 12, 2, 12, P.crateHi);
}
