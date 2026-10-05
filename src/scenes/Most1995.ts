/**
 * ERA_1995 — Level 6 “Мост / Волхов” (pedestrian bridge, Winter 1995).
 * Wave 1 on approach → timed dialogue → Wave 2 on deck + reclaim letter → clear.
 */

import type { StateManager } from '@/core/StateManager';
import { MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { MOST_PAL } from '@/art/segaPalette';
import { ditherRect, px, speckles } from '@/art/pixelDraw';
import { drawSnappedSnow } from '@/art/snowParticles';
import {
  drawMostBridgeFar,
  mostViewCaption,
  preloadMostBridgeViews,
} from '@/art/mostBridgeViews';
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
  MOST_BRIDGE_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';
import { QuizSystem, quizHudHint } from '@/systems/QuizSystem';
import { tickQuizEncounter } from '@/systems/quizEncounter';
import { LOGICAL_WIDTH } from '@/core/Display';

const P = MOST_PAL;
const WORLD_W = 560;
const FLOOR_Y = 186;
const CAM_MAX = WORLD_W - LOGICAL_WIDTH;
const WRONG_REASSURE_MF_DRAIN = 22;

type LevelPhase = 'wave1' | 'dialogue' | 'wave2' | 'cleared' | 'gameover';

interface LetterPickup {
  x: number;
  y: number;
  taken: boolean;
}

export interface MostSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: TeaSystem;
}

export function createMost1995Scene(deps: MostSceneDeps) {
  const { states, player, hud, beer } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let bridgePressure = 1;
  let hasLetter = false;
  let letter: LetterPickup | null = null;
  let winTimer = 0;
  let dialogueStarted = false;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  const bulbs: PointLight[] = [
    { kind: 'point', x: 80, y: 70, radius: 28, color: '#e8d080', phase: 0.3 },
    { kind: 'point', x: 220, y: 62, radius: 26, color: '#d8c070', phase: 1.1 },
    { kind: 'point', x: 360, y: 64, radius: 28, color: '#e0c868', phase: 2.0 },
    { kind: 'point', x: 500, y: 68, radius: 24, color: '#c8b060', phase: 0.7 },
  ];

  const spawnWave1 = (): void => {
    gangsters = [
      new Gangster({ x: 160, y: FLOOR_Y, hp: 34 }),
      new Gangster({ x: 240, y: FLOOR_Y, hp: 32 }),
      new Gangster({ x: 320, y: FLOOR_Y, hp: 36 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = bridgePressure < 0.4 ? 0.82 : bridgePressure > 0.8 ? 1.16 : 1;
    const hpBonus = bridgePressure > 0.8 ? 6 : 0;
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
        x: 450,
        y: FLOOR_Y,
        hp: 40 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) g.speedMul = speedMul;
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Зачисти подход к мосту';
    if (phase === 'dialogue') return 'Мост - выбор, таймер';
    if (phase === 'wave2') {
      if (!hasLetter) return 'Верни конверт + зачисти';
      return 'Добей гопников';
    }
    if (phase === 'cleared') return 'УР. 6 ПРОЙДЕН';
    return 'КОНЕЦ ИГРЫ';
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
      levelTitle: 'Мост / Волхов',
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
    toast = 'МОСТ ЗАБЛОКИРОВАН';
    toastTimer = 1.2;
    dialogue.open(MOST_BRIDGE_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_bridge') {
      bridgePressure = 0.25;
      toast = 'КОНВЕРТ НАШ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      bridgePressure = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - СД' : 'СЛАБО - СД';
      toastTimer = 1.6;
    } else {
      bridgePressure = 0.7;
    }

    if (player.isKo) {
      phase = 'gameover';
      gameOverTimer = 1.8;
      syncHud('КОНЕЦ ИГРЫ');
      return;
    }

    phase = 'wave2';
    hasLetter = false;
    letter = null;
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
    drawMostWorld(ctx, WORLD_W, viewH, time);
    if (letter && !letter.taken) drawEnvelope(ctx, letter.x, letter.y);
    for (const g of gangsters) g.render(ctx, alpha);
    player.render(ctx, alpha);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number): void => {
    const camProgress = CAM_MAX > 0 ? Math.max(0, Math.min(1, camX / CAM_MAX)) : 0;
    stack.setLayers([
      {
        id: 'sky',
        speedRatio: 0.08,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, _scroll, _c, w, h) =>
          drawMostBridgeFar(ctx, w, h, camProgress, time),
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
              ambient: { color: 'rgba(14, 22, 34, 0.55)' },
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
          }, 20),
      },
    ]);
  };

  return {
    enter(): void {
      beer.pauseForFlashback();
      preloadMostBridgeViews();
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
      bridgePressure = 1;
      hasLetter = false;
      letter = null;
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
        syncHud('КОНЕЦ ИГРЫ');
        return;
      }

      if (phase === 'cleared') {
        winTimer -= dt;
        player.update(dt);
        syncHud('УР. 6 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level6Cleared', true);
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
        if (drop && !letter) {
          letter = { x: drop.x, y: drop.y, taken: false };
        }
      }

      if (letter && !letter.taken && !hasLetter) {
        if (Math.abs(player.x - letter.x) < 16 && Math.abs(player.y - letter.y) < 20) {
          letter.taken = true;
          hasLetter = true;
          toast = 'КОНВЕРТ ОТЦА';
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
        if (alive === 0 && hasLetter) {
          phase = 'cleared';
          winTimer = 2.4;
          toast = 'ПИСЬМО СПАСЕНО';
          toastTimer = 2.4;
          syncHud('УР. 6 ПРОЙДЕН');
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
      const shakeX = shake > 0 ? Math.round(Math.sin(time * 55) * 3 * (shake / 0.28)) : 0;
      const shakeY = shake > 0 ? Math.round(Math.cos(time * 47) * 2 * (shake / 0.28)) : 0;

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
        uiPanel(ctx, 4, height - 14, Math.min(hw, width - 8), 11, 'rgba(10,12,18,0.72)', 'rgba(80,140,180,0.45)');
        drawUiText(ctx, hint, 8, height - 11, P.uiBorder, 6.5, 500);
      }

      if (phase === 'wave2') {
        const status = hasLetter ? 'КОНВЕРТ: ДА' : letter ? 'КОНВЕРТ: УПАЛ' : 'КОНВЕРТ: УКРАДЕН';
        const sw = measureUiText(ctx, status, 6.5, 550) + 8;
        uiPanel(
          ctx,
          width - sw - 4,
          36,
          sw,
          11,
          'rgba(12,14,20,0.85)',
          hasLetter ? 'rgba(64,200,120,0.7)' : 'rgba(224,112,64,0.7)',
        );
        drawUiText(ctx, status, width - sw, 38, hasLetter ? '#a0f0c0' : '#f0c0a0', 6.5, 550);
      }

      if (toast) {
        const tw2 = measureUiText(ctx, toast, 7, 600) + 14;
        uiPanel(
          ctx,
          Math.round((width - tw2) / 2),
          36,
          tw2,
          13,
          'rgba(16,24,36,0.88)',
          'rgba(112,192,232,0.7)',
        );
        drawUiTextCentered(ctx, toast, width / 2, 39, '#f0f8ff', 7, 600);
      } else if (phase === 'wave1' || phase === 'wave2' || phase === 'cleared') {
        const camProgress = CAM_MAX > 0 ? Math.max(0, Math.min(1, camX / CAM_MAX)) : 0;
        const caption = mostViewCaption(camProgress);
        const cw = measureUiText(ctx, caption, 6.5, 500) + 10;
        uiPanel(
          ctx,
          Math.round((width - cw) / 2),
          height - 28,
          cw,
          11,
          'rgba(10,14,22,0.55)',
          'rgba(80,140,180,0.35)',
        );
        drawUiTextCentered(ctx, caption, width / 2, height - 25, '#a0b8d0', 6.5, 500);
      }

      if (phase === 'gameover') {
        ctx.fillStyle = 'rgba(8, 4, 8, 0.55)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Конец игры', width / 2, height / 2 - 16, '#f08080', 12, 700);
        drawUiTextCentered(ctx, 'Назад в 2026…', width / 2, height / 2 + 2, P.uiText, 7, 500);
      }

      if (phase === 'cleared') {
        ctx.fillStyle = 'rgba(4, 12, 16, 0.45)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Ур. 6 пройден', width / 2, height / 2 - 16, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Мост свободен. Письмо с тобой', width / 2, height / 2 + 4, P.uiText, 7, 500);
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
      giveLetter: () => {
        hasLetter = true;
        if (letter) letter.taken = true;
      },
      forceClear: () => {
        phase = 'cleared';
        winTimer = 0.4;
        hasLetter = true;
        states.setFlag('level6Cleared', true);
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

function drawMostWorld(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  height: number,
  time: number,
): void {
  // Ice / water under bridge
  px(ctx, 0, FLOOR_Y + 8, worldW, height - FLOOR_Y - 8, P.water);
  ditherRect(ctx, 0, FLOOR_Y + 8, worldW, 24, P.water, P.waterHi);
  speckles(ctx, 0, FLOOR_Y + 10, worldW, 30, P.ice, 40, 2);
  px(ctx, 40, FLOOR_Y + 18, 80, 6, P.iceHi);
  px(ctx, 200, FLOOR_Y + 22, 100, 5, P.ice);
  px(ctx, 380, FLOOR_Y + 16, 90, 7, P.iceDark);

  // Bridge deck
  px(ctx, 0, FLOOR_Y, worldW, 8, P.deck);
  px(ctx, 0, FLOOR_Y, worldW, 3, P.deckHi);
  px(ctx, 0, FLOOR_Y + 5, worldW, 2, P.deckDark);
  speckles(ctx, 0, FLOOR_Y - 2, worldW, 6, P.snowMid, 28, 1);

  // Rails + lamps
  for (let x = 0; x < worldW; x += 28) {
    px(ctx, x, FLOOR_Y - 22, 2, 22, P.rail);
    px(ctx, x, FLOOR_Y - 22, 26, 2, P.railHi);
  }
  for (let i = 0; i < 5; i++) {
    const lx = 60 + i * 110;
    px(ctx, lx, FLOOR_Y - 70, 3, 48, P.post);
    px(ctx, lx - 6, FLOOR_Y - 74, 15, 8, P.post);
    const on = Math.sin(time * 3.5 + i) > -0.65;
    px(ctx, lx - 4, FLOOR_Y - 72, 11, 5, on ? P.lamp : P.lampDim);
  }

  // Stone abutments
  px(ctx, 0, FLOOR_Y - 40, 36, 40, P.stoneDark);
  px(ctx, 4, FLOOR_Y - 36, 28, 32, P.stone);
  px(ctx, worldW - 40, FLOOR_Y - 40, 40, 40, P.stoneDark);
  px(ctx, worldW - 36, FLOOR_Y - 36, 28, 32, P.stoneHi);
}

function drawEnvelope(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  px(ctx, ox - 8, oy - 10, 16, 10, P.envelope);
  px(ctx, ox - 8, oy - 10, 16, 2, P.envelopeDark);
  px(ctx, ox - 7, oy - 8, 14, 1, P.envelopeHi);
  // Fold triangle
  px(ctx, ox - 1, oy - 9, 2, 6, P.envelopeDark);
  px(ctx, ox - 6, oy - 4, 12, 1, P.envelopeDark);
}
