import { audio } from '@/audio';
/**
 * ERA_1995 — Level 8 “Детинец” (Kremlin walls finale, Winter 1995).
 * Courtyard approach wave → timed dialogue → wall walk + boss-lite → clear.
 */

import type { StateManager } from '@/core/StateManager';
import { effectShake } from '@/core/Settings';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { DETINETS_PAL } from '@/art/segaPalette';
import { ditherRect, fillBricks, px, speckles } from '@/art/pixelDraw';
import { drawSnappedSnow } from '@/art/snowParticles';
import {
  drawDetinetsHallBackdrop,
  detinetsHallViewsReady,
  detinetsViewCaption,
  preloadDetinetsHallViews,
} from '@/art/detinetsHallViews';
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
  DETINETS_WALL_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';
import { QuizSystem, quizHudHint } from '@/systems/QuizSystem';
import { tickQuizEncounter } from '@/systems/quizEncounter';

const P = DETINETS_PAL;
const WORLD_W = 580;
const GROUND_Y = 200;
const WRONG_REASSURE_MF_DRAIN = 22;
const WALL_Y = 78;

type LevelPhase = 'wave1' | 'dialogue' | 'wave2' | 'cleared' | 'gameover';

interface Platform {
  x: number;
  y: number;
  w: number;
}

/** Ground → ramparts → wall walk. */
const PLATFORMS: readonly Platform[] = [
  { x: 0, y: GROUND_Y, w: 240 },
  { x: 180, y: 168, w: 70 },
  { x: 230, y: 138, w: 70 },
  { x: 280, y: 108, w: 80 },
  { x: 340, y: WALL_Y, w: 240 },
];

export interface DetinetsSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: TeaSystem;
}

export function createDetinets1995Scene(deps: DetinetsSceneDeps) {
  const { states, player, hud, beer } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let resolve = 1;
  let winTimer = 0;
  let dialogueStarted = false;
  let boss: Gangster | null = null;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  const bulbs: PointLight[] = [
    { kind: 'point', x: 90, y: 110, radius: 26, color: '#e8c868', phase: 0.3 },
    { kind: 'point', x: 320, y: 50, radius: 30, color: '#d0b060', phase: 1.5 },
    { kind: 'point', x: 480, y: 42, radius: 32, color: '#e0c878', phase: 2.3 },
  ];

  const spawnWave1 = (): void => {
    boss = null;
    gangsters = [
      new Gangster({ x: 140, y: GROUND_Y, hp: 36 }),
      new Gangster({ x: 210, y: GROUND_Y, hp: 34 }),
      new Gangster({ x: 280, y: GROUND_Y, hp: 38 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = resolve < 0.4 ? 0.85 : resolve > 0.8 ? 1.22 : 1.08;
    const hpBonus = resolve > 0.8 ? 10 : 0;
    const bossG = new Gangster({
      x: 440,
      y: WALL_Y,
      hp: 80 + hpBonus,
      variant: 'tracksuit',
    });
    bossG.speedMul = speedMul * 0.95;
    boss = bossG;
    gangsters = [
      bossG,
      new Gangster({
        x: 380,
        y: WALL_Y,
        hp: 42 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 510,
        y: WALL_Y,
        hp: 40 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) {
      if (g !== bossG) g.speedMul = speedMul;
    }
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Зачисти подход к стене';
    if (phase === 'dialogue') return 'Финал зимы - выбор';
    if (phase === 'wave2') return 'Стена - старший + волна';
    if (phase === 'cleared') return 'УР. 8 ПРОЙДЕН';
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
      levelTitle: 'Детинец',
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
    toast = 'ФИНАЛ ЗИМЫ';
    toastTimer = 1.2;
    dialogue.open(DETINETS_WALL_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_detinets') {
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
      syncHud('ПЕРЕДЫШКА…');
      return;
    }

    phase = 'wave2';
    spawnWave2();
    player.x = 360;
    player.setFloorY(WALL_Y);
    player.y = WALL_Y;
    player.grounded = true;
    syncHud();
  };

  const gangsterFloor = (_g: Gangster): number => {
    if (phase === 'wave2') return WALL_Y;
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
    drawDetinetsWorld(ctx, WORLD_W, viewH, time);
    drawPlatforms(ctx);
    for (const g of gangsters) {
      g.render(ctx, alpha);
      if (boss && g === boss && !g.isKo) {
        const ox = Math.round(g.x);
        const oy = Math.round(g.y);
        drawUiText(ctx, '★', ox - 3, oy - 34, '#f0c040', 7, 700);
      }
    }
    player.render(ctx, alpha);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number): void => {
    const progress =
      WORLD_W > LOGICAL_WIDTH ? camX / (WORLD_W - LOGICAL_WIDTH) : 0;
    stack.setLayers([
      {
        id: 'sky',
        speedRatio: 0.08,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => {
          if (detinetsHallViewsReady()) {
            drawDetinetsHallBackdrop(ctx, w, h, progress, time);
          } else {
            drawKremlinSky(ctx, w, h, scroll);
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
                color: detinetsHallViewsReady()
                  ? 'rgba(18, 16, 22, 0.42)'
                  : 'rgba(18, 22, 34, 0.52)',
              },
              points: bulbs,
              cones: [],
              time,
            },
          );
        },
      },
      {
        id: 'snow',
        speedRatio: 0.9,
        zIndex: 50,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) =>
          drawSnappedSnow(ctx, w, h, scroll, time, {
            hi: P.snow,
            mid: P.snow,
            lo: P.snowMid,
          }, 24),
      },
    ]);
  };

  return {
    enter(): void {
      audio.playTheme('detinets');
      beer.pauseForFlashback();
      preloadDetinetsHallViews();
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
        syncHud('ПЕРЕДЫШКА…');
        return;
      }

      if (phase === 'cleared') {
        winTimer -= dt;
        player.update(dt);
        syncHud('УР. 8 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level8Cleared', true);
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', {
            era: 'ERA_2026',
            fadeSeconds: 0.65,
            data: { epilogueFinale: true },
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
        const maxX = phase === 'wave2' ? WORLD_W - 20 : 300;
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
          toast = 'ЗИМА ДОЧИТАНА';
          toastTimer = 2.8;
          syncHud('УР. 8 ПРОЙДЕН');
        } else {
          const bossAlive = boss && !boss.isKo;
          syncHud(bossAlive ? 'Старший на стене' : 'Добей остальных');
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
        uiPanel(ctx, 4, height - 14, Math.min(hw, width - 8), 11, 'rgba(10,12,18,0.72)', 'rgba(200,160,80,0.45)');
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
      } else if (
        detinetsHallViewsReady() &&
        (phase === 'wave1' || phase === 'wave2' || phase === 'cleared')
      ) {
        const progress =
          WORLD_W > LOGICAL_WIDTH ? camX / (WORLD_W - LOGICAL_WIDTH) : 0;
        const cap = detinetsViewCaption(progress);
        const cw = measureUiText(ctx, cap, 6.5, 500) + 10;
        uiPanel(
          ctx,
          Math.round((width - cw) / 2),
          height - 28,
          cw,
          11,
          'rgba(16,12,10,0.55)',
          'rgba(200,160,80,0.35)',
        );
        drawUiTextCentered(ctx, cap, width / 2, height - 25, P.uiText, 6.5, 500);
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
        drawUiTextCentered(ctx, 'Ур. 8 пройден', width / 2, height / 2 - 18, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Стена умолкла. Долг закрыт', width / 2, height / 2 + 2, P.uiText, 7, 500);
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
        player.setFloorY(108);
        player.y = 108;
        beginDialogue();
      },
      skipToChoices: () => {
        if (!dialogue.isOpen) {
          player.x = 280;
          player.setFloorY(108);
          player.y = 108;
          beginDialogue();
        }
        dialogue.advance();
      },
      forceWave2: () => {
        dialogue.resetSilent();
      quiz.closeSilent();
        resolve = 0.25;
        phase = 'wave2';
        spawnWave2();
        player.x = 360;
        player.setFloorY(WALL_Y);
        player.y = WALL_Y;
        player.grounded = true;
        syncHud();
      },
      forceClear: () => {
        phase = 'cleared';
        winTimer = 0.4;
        states.setFlag('level8Cleared', true);
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

function drawKremlinSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
): void {
  px(ctx, 0, 0, width, height, P.skyTop);
  ditherRect(ctx, 0, 0, width, 70, P.skyTop, P.skyMid);
  px(ctx, 0, 85, width, 50, P.skyLow);
  const ox = Math.round(scroll * 0.12);
  // Sofia dome silhouette
  const dx = 200 - (ox % 60);
  px(ctx, dx, 50, 40, 40, '#152030');
  ctx.fillStyle = P.domeDark;
  ctx.beginPath();
  ctx.ellipse(dx + 20, 48, 18, 14, 0, Math.PI, 0);
  ctx.fill();
  px(ctx, dx + 18, 30, 4, 12, P.cross);
  px(ctx, dx + 14, 34, 12, 2, P.cross);
}

function drawDetinetsWorld(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  height: number,
  _time: number,
): void {
  px(ctx, 0, GROUND_Y, worldW, height - GROUND_Y, P.stoneDark);
  px(ctx, 0, GROUND_Y, Math.min(260, worldW), 6, P.stone);
  speckles(ctx, 0, GROUND_Y, 260, 16, P.snowMid, 26, 1);

  // Left trees / snow
  for (let i = 0; i < 3; i++) {
    const tx = 20 + i * 40;
    px(ctx, tx + 6, GROUND_Y - 40, 4, 40, P.tree);
    px(ctx, tx, GROUND_Y - 48, 16, 18, P.treeHi);
  }

  // Massive kremlin wall right
  fillBricks(ctx, 340, 20, 240, WALL_Y + 4, P.brick, P.mortar, P.brickHi, 10, 5, P.brickDark);
  px(ctx, 340, 20, 240, 8, P.snow);
  speckles(ctx, 340, 20, 240, 10, P.snowMid, 18, 1);

  // Merlons
  for (let i = 0; i < 8; i++) {
    px(ctx, 348 + i * 28, 12, 16, 12, P.brickHi);
    px(ctx, 348 + i * 28, 12, 16, 3, P.snow);
  }

  // Narrow windows
  for (let i = 0; i < 5; i++) {
    px(ctx, 360 + i * 40, 40, 10, 18, i % 2 === 0 ? P.windowLit : P.windowDark);
  }

  // Tower
  fillBricks(ctx, 500, 0, 50, WALL_Y + 20, P.brickDark, P.mortar, P.brick, 10, 5, P.brickDark);
  px(ctx, 505, 0, 40, 8, P.dome);
  px(ctx, 518, -8, 3, 10, P.cross);
}

function drawPlatforms(ctx: CanvasRenderingContext2D): void {
  for (const p of PLATFORMS) {
    if (p.y === GROUND_Y) continue;
    px(ctx, p.x, p.y, p.w, 5, P.wallWalkHi);
    px(ctx, p.x, p.y + 2, p.w, 2, P.wallWalk);
    px(ctx, p.x + 4, p.y + 5, 2, 10, P.stoneDark);
    px(ctx, p.x + p.w - 6, p.y + 5, 2, 10, P.stoneDark);
  }
  px(ctx, 340, WALL_Y, 240, 5, P.wallWalkHi);
  px(ctx, 340, WALL_Y + 2, 240, 2, P.wallWalk);
  speckles(ctx, 340, WALL_Y - 2, 240, 4, P.snow, 20, 1);
}
