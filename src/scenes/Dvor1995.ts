/**
 * ERA_1995 — Level 5 “Двор / крыша” (block finale, Winter 1995).
 * Courtyard wave → timed dialogue → climb to roof → harder wave + boss-lite → clear.
 */

import type { StateManager } from '@/core/StateManager';
import { ART_SCALE, LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import type { HUD } from '@/ui/HUD';
import type { BeerSystem } from '@/systems/BeerSystem';
import { DVOR_PAL } from '@/art/segaPalette';
import { ditherRect, fillBricks, px, speckles } from '@/art/pixelDraw';
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
  DVOR_ROOF_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';
import { QuizSystem, quizHudHint } from '@/systems/QuizSystem';
import { tickQuizEncounter } from '@/systems/quizEncounter';

const P = DVOR_PAL;
const WORLD_W = 560;
const GROUND_Y = 200;
const WRONG_REASSURE_MF_DRAIN = 22;
const ROOF_Y = 72;

type LevelPhase = 'wave1' | 'dialogue' | 'wave2' | 'cleared' | 'gameover';

interface Platform {
  x: number;
  y: number;
  w: number;
}

/** Yard floor → laundry landings → roof ledge. */
const PLATFORMS: readonly Platform[] = [
  { x: 0, y: GROUND_Y, w: 220 },
  { x: 170, y: 168, w: 70 },
  { x: 220, y: 136, w: 70 },
  { x: 270, y: 104, w: 90 },
  { x: 340, y: ROOF_Y, w: 220 },
];

export interface DvorSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: BeerSystem;
}

export function createDvor1995Scene(deps: DvorSceneDeps) {
  const { states, player, hud, beer } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let resolve = 1; // 0 calm … 1 rattled (affects wave2)
  let winTimer = 0;
  let dialogueStarted = false;
  let boss: Gangster | null = null;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  const bulbs: PointLight[] = [
    { kind: 'point', x: 80, y: 120, radius: 26, color: '#e8c868', phase: 0.2 },
    { kind: 'point', x: 300, y: 60, radius: 28, color: '#d0b060', phase: 1.4 },
    { kind: 'point', x: 460, y: 40, radius: 30, color: '#e0c878', phase: 2.2 },
  ];

  const spawnWave1 = (): void => {
    boss = null;
    gangsters = [
      new Gangster({ x: 140, y: GROUND_Y, hp: 34 }),
      new Gangster({ x: 200, y: GROUND_Y, hp: 32 }),
      new Gangster({ x: 260, y: GROUND_Y, hp: 36 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = resolve < 0.4 ? 0.85 : resolve > 0.8 ? 1.2 : 1.05;
    const hpBonus = resolve > 0.8 ? 8 : 0;
    const bossG = new Gangster({
      x: 420,
      y: ROOF_Y,
      hp: 72 + hpBonus,
      variant: 'tracksuit',
    });
    bossG.speedMul = speedMul * 0.95;
    boss = bossG;
    gangsters = [
      bossG,
      new Gangster({
        x: 380,
        y: ROOF_Y,
        hp: 40 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 480,
        y: ROOF_Y,
        hp: 38 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) {
      if (g !== bossG) g.speedMul = speedMul;
    }
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Зачисти двор';
    if (phase === 'dialogue') return 'Разговор - финал блока';
    if (phase === 'wave2') return 'Крыша - старший + волна';
    if (phase === 'cleared') return 'УР. 5 ПРОЙДЕН';
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
      levelTitle: 'Двор / крыша',
      objective: objective ?? objectiveForPhase(),
    });
  };

  const clearCombatAndReturn = (): void => {
    gangsters = [];
    boss = null;
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
    toast = 'ФИНАЛ БЛОКА';
    toastTimer = 1.2;
    dialogue.open(DVOR_ROOF_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_relative') {
      resolve = 0.25;
      toast = 'РЕШИМОСТЬ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      resolve = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - СД' : 'СЛАБО - СД';
      toastTimer = 1.6;
    } else {
      resolve = 0.7;
    }

    if (player.isKo) {
      phase = 'gameover';
      gameOverTimer = 1.8;
      syncHud('КОНЕЦ ИГРЫ');
      return;
    }

    phase = 'wave2';
    spawnWave2();
    player.x = 360;
    player.setFloorY(ROOF_Y);
    player.y = ROOF_Y;
    player.grounded = true;
    syncHud();
  };

  const gangsterFloor = (_g: Gangster): number => {
    if (phase === 'wave2') return ROOF_Y;
    return GROUND_Y;
  };

  const drawGameplayLayer = (
    ctx: CanvasRenderingContext2D,
    _scroll: number,
    _cam: number,
    _viewW: number,
    viewH: number,
    alpha: number,
  ): void => {
    drawDvorWorld(ctx, WORLD_W, viewH, time);
    drawPlatforms(ctx);
    drawLaundry(ctx, time);
    for (const g of gangsters) {
      g.render(ctx, alpha);
      if (boss && g === boss && !g.isKo) {
        // Boss pip marker
        const ox = Math.round(g.x);
        const oy = Math.round(g.y);
        drawUiText(ctx, '★', ox - 3, oy - 34, '#f0c040', 7, 700);
      }
    }
    player.render(ctx, alpha);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number): void => {
    stack.setLayers([
      {
        id: 'sky',
        speedRatio: 0.08,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => drawSkyBlocks(ctx, w, h, scroll),
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
              ambient: { color: 'rgba(22, 26, 36, 0.52)' },
              points: bulbs,
              cones: [],
              time,
            },
            ART_SCALE,
          );
        },
      },
      {
        id: 'snow',
        speedRatio: 0.9,
        zIndex: 50,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => {
          for (let i = 0; i < 22; i++) {
            const x = ((i * 53 + scroll * 35 + time * 28) % (w + 16)) - 8;
            const y = ((i * 29 + time * 40) % (h - 50)) + 8;
            px(ctx, Math.round(x), Math.round(y), 1, 1, P.snow);
          }
        },
      },
    ]);
  };

  return {
    enter(): void {
      beer.pauseForFlashback();
      player.setEra('teen');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = 40;
      player.setFloorY(GROUND_Y);
      player.y = GROUND_Y;
      player.facing = 1;
      player.walkSpeed = 58;
      camX = 0;
        phase = 'wave1';
      gameOverTimer = 0;
      toast = '';
      toastTimer = 0;
      time = 0;
      shake = 0;
      resolve = 1;
      winTimer = 0;
      dialogueStarted = false;
      boss = null;
      dialogue.resetSilent();
      quiz.closeSilent();
      spawnWave1();
      syncHud();
    },

    exit(): void {
      gangsters = [];
        boss = null;
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
        syncHud('УР. 5 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level5Cleared', true);
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', {
            era: 'ERA_2026',
            fadeSeconds: 0.65,
            data: { epilogue: true },
          });
        }
        return;
      }

      player.update(dt);
      const input = states.input;

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

      player.applyPhysics(dt, 16, WORLD_W - 16, PLATFORMS);

      for (const g of gangsters) {
        const fy = gangsterFloor(g);
        const minX = phase === 'wave2' ? 340 : 40;
        const maxX = phase === 'wave2' ? WORLD_W - 20 : 280;
        g.update(dt, player.x, player.y, fy, minX, maxX);
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
        if (alive === 0) {
          phase = 'cleared';
          winTimer = 2.8;
          toast = 'БЛОК 1995 ЗАКРЫТ';
          toastTimer = 2.8;
          syncHud('УР. 5 ПРОЙДЕН');
        } else {
          const bossAlive = boss && !boss.isKo;
          syncHud(bossAlive ? 'Старший на крыше' : 'Добей остальных');
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
        uiPanel(ctx, 4, height - 14, Math.min(hw, width - 8), 11, 'rgba(10,12,18,0.72)', 'rgba(120,100,60,0.45)');
        drawUiText(ctx, hint, 8, height - 11, P.uiBorder, 6.5, 500);
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
        drawUiTextCentered(ctx, 'Конец игры', width / 2, height / 2 - 16, '#f08080', 12, 700);
        drawUiTextCentered(ctx, 'Назад в 2026…', width / 2, height / 2 + 2, P.uiText, 7, 500);
      }

      if (phase === 'cleared') {
        ctx.fillStyle = 'rgba(4, 12, 8, 0.45)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Ур. 5 пройден', width / 2, height / 2 - 18, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Двор умолк. Зима 1995…', width / 2, height / 2 + 2, P.uiText, 7, 500);
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
      forceDialogue: () => {
        player.x = 280;
        player.setFloorY(104);
        player.y = 104;
        beginDialogue();
      },
      skipToChoices: () => {
        if (!dialogue.isOpen) {
          player.x = 280;
          player.setFloorY(104);
          player.y = 104;
          beginDialogue();
        }
        dialogue.advance();
        dialogue.advance();
      },
      forceWave2: () => {
        dialogue.resetSilent();
      quiz.closeSilent();
        resolve = 0.25;
        phase = 'wave2';
        spawnWave2();
        player.x = 360;
        player.setFloorY(ROOF_Y);
        player.y = ROOF_Y;
        player.grounded = true;
        syncHud();
      },
      forceClear: () => {
        phase = 'cleared';
        winTimer = 0.4;
        states.setFlag('level5Cleared', true);
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

function drawSkyBlocks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
): void {
  px(ctx, 0, 0, width, height, P.skyTop);
  ditherRect(ctx, 0, 0, width, 70, P.skyTop, P.skyMid);
  px(ctx, 0, 85, width, 50, P.skyLow);
  const ox = Math.round(scroll * 0.15);
  for (let i = -1; i < 4; i++) {
    const bx = i * 110 - (ox % 110);
    fillBricks(ctx, bx, 40, 70, 80, P.brick, P.mortar, P.brickHi, 10, 5, P.brickDark);
    px(ctx, bx + 10, 55, 12, 14, P.windowLit);
    px(ctx, bx + 35, 62, 12, 14, P.windowDark);
  }
}

function drawDvorWorld(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  height: number,
  _time: number,
): void {
  // Courtyard ground
  px(ctx, 0, GROUND_Y, worldW, height - GROUND_Y, P.yardDark);
  px(ctx, 0, GROUND_Y, Math.min(240, worldW), 6, P.yard);
  speckles(ctx, 0, GROUND_Y, 240, 16, P.snowMid, 24, 1);

  // Brick walls left
  fillBricks(ctx, 0, 40, 50, GROUND_Y - 40, P.brick, P.mortar, P.brickHi, 10, 5, P.brickDark);

  // Roof building right
  px(ctx, 340, 20, 220, ROOF_Y + 4, P.roof);
  px(ctx, 340, 20, 220, 8, P.roofSnow);
  speckles(ctx, 340, 20, 220, 10, P.snow, 20, 1);
  for (let i = 0; i < 4; i++) {
    px(ctx, 360 + i * 45, 36, 16, 20, i % 2 === 0 ? P.windowLit : P.windowDark);
  }

  // Satellite dishes
  drawDish(ctx, 390, 28);
  drawDish(ctx, 500, 32);
}

function drawPlatforms(ctx: CanvasRenderingContext2D): void {
  for (const p of PLATFORMS) {
    if (p.y === GROUND_Y) continue;
    px(ctx, p.x, p.y, p.w, 5, P.yardHi);
    px(ctx, p.x, p.y + 2, p.w, 2, P.yardDark);
    // Pipe / ledge supports
    px(ctx, p.x + 4, p.y + 5, 2, 12, P.line);
    px(ctx, p.x + p.w - 6, p.y + 5, 2, 12, P.line);
  }
  // Roof walk
  px(ctx, 340, ROOF_Y, 220, 5, P.roofHi);
  px(ctx, 340, ROOF_Y + 2, 220, 2, P.roof);
}

function drawLaundry(ctx: CanvasRenderingContext2D, time: number): void {
  const sway = Math.sin(time * 2) * 2;
  // Lines across yard climb
  px(ctx, 180, 150, 100, 1, P.line);
  px(ctx, 230, 118, 90, 1, P.line);
  drawSheet(ctx, 200 + sway, 150, P.laundry);
  drawSheet(ctx, 240 - sway, 150, P.laundryBlue);
  drawSheet(ctx, 260 + sway, 118, P.laundryPink);
  drawSheet(ctx, 300 - sway, 118, P.laundry);
}

function drawSheet(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  px(ctx, Math.round(x), y, 14, 18, color);
  px(ctx, Math.round(x) + 2, y + 2, 10, 3, '#ffffff');
}

function drawDish(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, x, y + 8, 2, 10, P.dish);
  ctx.fillStyle = P.dishHi;
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 6, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, x - 1, y + 4, 4, 2, P.dish);
}
