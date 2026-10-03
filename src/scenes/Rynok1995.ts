/**
 * ERA_1995 — Level 1 “Novgorod Центральный рынок, Winter 1995” (Neo-Noir 16-bit).
 * Wave 1 adults (school quiz) → mother-stall timed dialogue → Wave 2 quizzes → mother’s coat.
 * Midground = wavy blue-glass market hall; gameplay = stalls / street / bus stop.
 * Parallax / lighting / MF Game Over → apartment snap-back preserved.
 */

import type { StateManager } from '@/core/StateManager';
import { ART_SCALE, LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import type { HUD } from '@/ui/HUD';
import type { BeerSystem } from '@/systems/BeerSystem';
import { RYNOK_PAL } from '@/art/segaPalette';
import { ditherRect, fillBricks, fillSkyGradient, px, segaBox, speckles, woodGrain } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import { drawFamilyFaceWithRim, preloadFamilyFaces } from '@/art/familyFaces';
import { ParallaxStack } from '@/render/ParallaxLayer';
import {
  applyLightingOverlay,
  type PointLight,
} from '@/render/LightingOverlay';
import {
  DialogueSystem,
  MOTHER_STALL_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';
import { QuizSystem, quizHudHint } from '@/systems/QuizSystem';
import { tickQuizEncounter } from '@/systems/quizEncounter';

const FLOOR_Y = 188;
const R = RYNOK_PAL;
const WORLD_W = 560;
/** Mother’s МЕХА stall X (awning left edge). */
const MOTHER_STALL_X = 330;
const MOTHER_STALL_W = 68;
const WRONG_REASSURE_MF_DRAIN = 22;

type LevelPhase =
  | 'wave1'
  | 'dialogue'
  | 'wave2'
  | 'cleared'
  | 'gameover';

interface CoatPickup {
  x: number;
  y: number;
  taken: boolean;
}

interface AmbientDog {
  x: number;
  y: number;
  facing: 1 | -1;
  speed: number;
  phase: number;
  bob: number;
}

interface StallDef {
  x: number;
  label: string;
  theme: KioskTheme;
  goods: 'bread' | 'fish' | 'seeds' | 'veg' | 'furs';
  seller: 'man' | 'woman' | 'aunt';
}

type KioskTheme = 'tan' | 'grey' | 'rust' | 'blue' | 'green';

export interface RynokSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: BeerSystem;
}

export function createRynok1995Scene(deps: RynokSceneDeps) {
  const { states, player, hud, beer } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let dogs: AmbientDog[] = [];
  let motherPanic = 1; // 0 calm … 1 panicked
  let hasCoat = false;
  let coat: CoatPickup | null = null;
  let winTimer = 0;
  let dialogueStarted = false;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  /** Soft street-lamp pools — no trash-fire barrels. */
  const lampSpots: PointLight[] = [
    { kind: 'point', x: 300, y: FLOOR_Y - 70, radius: 42, color: 'rgba(240, 210, 140, 0.55)', phase: 0.2 },
    { kind: 'point', x: 140, y: FLOOR_Y - 58, radius: 28, color: 'rgba(220, 190, 120, 0.35)', phase: 1.1 },
    { kind: 'point', x: 460, y: FLOOR_Y - 58, radius: 30, color: 'rgba(220, 190, 120, 0.32)', phase: 2.0 },
  ];

  const stalls: StallDef[] = [
    { x: 72, label: 'ХЛЕБ', theme: 'tan', goods: 'bread', seller: 'aunt' },
    { x: 148, label: 'РЫБА', theme: 'grey', goods: 'fish', seller: 'man' },
    { x: 224, label: 'СЕМЕЧКИ', theme: 'green', goods: 'seeds', seller: 'woman' },
    { x: MOTHER_STALL_X, label: 'МЕХА', theme: 'rust', goods: 'furs', seller: 'woman' },
    { x: 410, label: 'ОВОЩИ', theme: 'blue', goods: 'veg', seller: 'man' },
  ];

  const spawnDogs = (): void => {
    dogs = [
      { x: 90, y: FLOOR_Y - 2, facing: 1, speed: 22, phase: 0.3, bob: 0 },
      { x: 420, y: FLOOR_Y - 1, facing: -1, speed: 18, phase: 1.7, bob: 0.4 },
    ];
  };

  const spawnWave1 = (): void => {
    gangsters = [
      new Gangster({ x: 200, y: FLOOR_Y, hp: 34, variant: 'adult' }),
      new Gangster({ x: 280, y: FLOOR_Y, hp: 30, variant: 'adult' }),
      new Gangster({ x: 380, y: FLOOR_Y, hp: 36, variant: 'adult' }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = motherPanic < 0.4 ? 0.82 : motherPanic > 0.8 ? 1.15 : 1;
    const hpBonus = motherPanic > 0.8 ? 6 : 0;
    gangsters = [
      new Gangster({
        x: 300,
        y: FLOOR_Y,
        hp: 38 + hpBonus,
        variant: 'adult',
        carriesCoat: true,
      }),
      new Gangster({
        x: 380,
        y: FLOOR_Y,
        hp: 34 + hpBonus,
        variant: 'adult',
      }),
      new Gangster({
        x: 460,
        y: FLOOR_Y,
        hp: 40 + hpBonus,
        variant: 'adult',
      }),
      new Gangster({
        x: 520,
        y: FLOOR_Y,
        hp: 32 + hpBonus,
        variant: 'adult',
      }),
    ];
    for (const g of gangsters) g.speedMul = speedMul;
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Ответь взрослым · к лотку МЕХА';
    if (phase === 'dialogue') return 'Говори с мамой - таймер';
    if (phase === 'wave2') {
      if (!hasCoat) return 'Забери шубу + ответь на вопросы';
      return 'Шуба есть - допроси остальных';
    }
    if (phase === 'cleared') return 'УР. 1 ПРОЙДЕН';
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
      levelTitle: 'Центральный рынок',
      objective: objective ?? objectiveForPhase(),
    });
  };

  const clearCombatAndReturn = (): void => {
    gangsters = [];
    coat = null;
    hasCoat = false;
    phase = 'gameover';
    gameOverTimer = 0;
    if (dialogue.isOpen) dialogue.close();
    quiz.closeSilent();
    player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
    states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.55 });
  };

  const nearMotherStall = (): boolean => {
    const cx = MOTHER_STALL_X + MOTHER_STALL_W / 2;
    return Math.abs(player.x - cx) < 55;
  };

  const beginMotherDialogue = (): void => {
    if (dialogueStarted || dialogue.isOpen) return;
    dialogueStarted = true;
    phase = 'dialogue';
    gangsters = [];
    quiz.closeSilent();
    player.vx = 0;
    toast = 'МАМА ЗОВЁТ';
    toastTimer = 1.2;
    dialogue.open(MOTHER_STALL_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_mother' || effect === 'calm_father') {
      motherPanic = 0.25;
      toast = 'МАМА УСПОКОИЛАСЬ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      motherPanic = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - ПАНИКА' : 'ПУСТЫЕ СЛОВА - СД';
      toastTimer = 1.6;
    } else {
      motherPanic = 0.7;
    }

    if (player.isKo) {
      phase = 'gameover';
      gameOverTimer = 1.8;
      syncHud('КОНЕЦ ИГРЫ');
      return;
    }

    phase = 'wave2';
    spawnWave2();
    syncHud();
  };

  /** Gameplay layer paint (world space; ParallaxStack already translates). */
  const drawGameplayLayer = (
    ctx: CanvasRenderingContext2D,
    _scrollX: number,
    _camX: number,
    _viewW: number,
    viewH: number,
    alpha: number,
  ): void => {
    drawMarketPlinth(ctx, WORLD_W);
    drawGround(ctx, WORLD_W, viewH);
    drawBlueFence(ctx, 20, FLOOR_Y, 90);
    drawBlueFence(ctx, 280, FLOOR_Y, 40);
    drawSnowPile(ctx, 48, FLOOR_Y, 28);
    drawSnowPile(ctx, 265, FLOOR_Y, 34);
    drawSnowPile(ctx, 500, FLOOR_Y, 30);
    // Market stalls with goods + ambient sellers (mother drawn separately at МЕХА)
    for (const s of stalls) {
      if (s.goods === 'furs') {
        drawMotherKiosk(ctx, s.x, FLOOR_Y);
      } else {
        drawGoodsStall(ctx, s.x, FLOOR_Y, s.label, s.theme, s.goods);
        drawStallSeller(ctx, s.x + 30, FLOOR_Y, s.seller, time);
      }
    }
    drawMother(ctx, MOTHER_STALL_X + 34, FLOOR_Y, motherPanic);
    drawCrates(ctx, 168, FLOOR_Y);
    drawCrates(ctx, 478, FLOOR_Y);
    drawBusStop(ctx, 448, FLOOR_Y);
    drawStreetLamp(ctx, 300, FLOOR_Y);
    drawGate(ctx);
    // Ambient dogs scurrying behind combatants
    for (const d of dogs) drawDog(ctx, d, time);
    if (coat && !coat.taken) drawCoatPickup(ctx, coat.x, coat.y);
    for (const g of gangsters) g.render(ctx, alpha);
    player.render(ctx, alpha);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number, width: number, _height: number): void => {
    stack.setLayers([
      {
        id: 'sky',
        speedRatio: 0,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, _s, _c, w, h) => drawSky(ctx, w, h),
      },
      {
        id: 'kremlin',
        speedRatio: 0.15,
        zIndex: 10,
        screenSpace: true,
        draw: (ctx, scroll) => drawKremlinSilhouette(ctx, width, scroll),
      },
      {
        id: 'market_hall',
        speedRatio: 0.42,
        zIndex: 20,
        screenSpace: true,
        draw: (ctx, scroll) => drawCentralMarketHall(ctx, width, scroll),
      },
      {
        id: 'gameplay',
        speedRatio: 1,
        zIndex: 30,
        draw: (ctx, scroll, cam, w, h) => drawGameplayLayer(ctx, scroll, cam, w, h, alpha),
      },
      {
        id: 'lighting',
        speedRatio: 0,
        zIndex: 40,
        screenSpace: true,
        draw: (ctx, _s, cam, w, h) => {
          applyLightingOverlay(ctx, cam, w, h, {
            ambient: { color: 'rgba(40, 44, 74, 0.52)' },
            points: lampSpots,
            cones: [],
            time,
          }, ART_SCALE);
        },
      },
      {
        id: 'weather',
        speedRatio: 1.25,
        zIndex: 50,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => drawSnowParticles(ctx, w, h, scroll),
      },
    ]);
  };

  return {
    enter(): void {
      beer.pauseForFlashback();
      preloadFamilyFaces();
      player.setEra('teen');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = 60;
      player.setFloorY(FLOOR_Y);
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 60;
      camX = 0;
      phase = 'wave1';
      gameOverTimer = 0;
      toast = '';
      toastTimer = 0;
      time = 0;
      shake = 0;
      motherPanic = 1;
      hasCoat = false;
      coat = null;
      winTimer = 0;
      dialogueStarted = false;
      dialogue.resetSilent();
      quiz.closeSilent();
      spawnWave1();
      spawnDogs();
      syncHud('Ответь взрослым · к лотку МЕХА');
    },

    exit(): void {
      gangsters = [];
      dogs = [];
      coat = null;
      dialogue.resetSilent();
      quiz.closeSilent();
      hud.set({ showSwagger: false });
    },

    update(dt: number): void {
      time += dt;
      if (shake > 0) shake = Math.max(0, shake - dt);
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toast = '';
      }

      // Ambient dogs — scurry along snow, reverse at edges (non-combat)
      for (const d of dogs) {
        d.bob += dt;
        d.x += d.facing * d.speed * dt;
        if (Math.sin(time * 1.3 + d.phase) > 0.92) {
          d.facing = (d.facing * -1) as 1 | -1;
        }
        if (d.x < 40) {
          d.x = 40;
          d.facing = 1;
        }
        if (d.x > WORLD_W - 40) {
          d.x = WORLD_W - 40;
          d.facing = -1;
        }
      }

      // ── Dialogue modal: pause quiz sim, feed input to DialogueSystem ──
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
        motherPanic = Math.min(1, motherPanic + dt * 0.02);
        syncHud();
        const target = player.x - 140;
        camX += (target - camX) * Math.min(1, dt * 6);
        if (camX < 0) camX = 0;
        if (camX > WORLD_W - LOGICAL_WIDTH) camX = WORLD_W - LOGICAL_WIDTH;
        return;
      }

      if (phase === 'gameover') {
        gameOverTimer -= dt;
        player.update(dt);
        if (gameOverTimer <= 0) {
          clearCombatAndReturn();
        }
        syncHud('КОНЕЦ ИГРЫ');
        return;
      }

      if (phase === 'cleared') {
        winTimer -= dt;
        player.update(dt);
        syncHud('УР. 1 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level1Cleared', true);
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.65 });
        }
        return;
      }

      player.update(dt);
      const input = states.input;

      // School quiz with adults (replaces punch/kick)
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
        const axis = input.axisX();
        player.applyWalk(axis, dt, 20, WORLD_W - 20);
      }

      player.applyPhysics(dt, 20, WORLD_W - 20);

      for (const g of gangsters) {
        g.update(dt, player.x, player.y, FLOOR_Y, 30, WORLD_W - 30);
        const drop = g.consumeCoatDrop();
        if (drop && !coat) {
          coat = { x: drop.x, y: drop.y, taken: false };
          toast = 'ШУБА УПАЛА!';
          toastTimer = 1.2;
        }
      }

      // Pick up mother's coat
      if (coat && !coat.taken && !hasCoat) {
        const dx = Math.abs(player.x - coat.x);
        const dy = Math.abs(player.y - coat.y);
        if (dx < 18 && dy < 24) {
          coat.taken = true;
          hasCoat = true;
          toast = 'ШУБА МАМЫ У ТЕБЯ';
          toastTimer = 1.5;
          motherPanic = Math.max(0.15, motherPanic - 0.35);
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

      // After answering ≥1 adult near МЕХА, or clear wave 1
      if (phase === 'wave1' && !dialogueStarted && !quiz.isOpen) {
        const anyKo = gangsters.some((g) => g.isKo);
        if ((nearMotherStall() && anyKo) || alive === 0) {
          beginMotherDialogue();
        } else {
          syncHud(
            alive === 1
              ? 'Один вопрос - к маме'
              : `Волна 1 · Вопросы ${alive} · К МЕХА`,
          );
        }
      } else if (phase === 'wave2' && !quiz.isOpen) {
        if (alive === 0 && hasCoat) {
          phase = 'cleared';
          winTimer = 2.4;
          toast = 'ЛОТОК ЦЕЛ · ШУБА СПАСЕНА';
          toastTimer = 2.4;
          syncHud('УР. 1 ПРОЙДЕН');
        } else {
          syncHud();
        }
      }

      const target = player.x - 140;
      camX += (target - camX) * Math.min(1, dt * 6);
      if (camX < 0) camX = 0;
      if (camX > WORLD_W - LOGICAL_WIDTH) camX = WORLD_W - LOGICAL_WIDTH;
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

      rebuildStack(alpha, width, height);
      stack.render(ctx, camX, width, height);

      ctx.restore();

      if (phase === 'dialogue' && dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      } else if (quiz.isOpen) {
        quiz.render(ctx, width, height);
      } else {
        const hint =
          phase === 'wave2' && !hasCoat
            ? `${quizHudHint()} · Забери шубу`
            : phase === 'wave1'
              ? `${quizHudHint()} · К лотку МЕХА`
              : `${quizHudHint()} · Пробел — прыжок`;
        const hw = measureUiText(ctx, hint, 6.5, 500) + 10;
        uiPanel(ctx, 4, height - 14, Math.min(hw, width - 8), 11, 'rgba(10,12,18,0.72)', 'rgba(120,100,60,0.45)');
        drawUiText(ctx, hint, 8, height - 11, R.uiBorder, 6.5, 500);
      }

      if (phase === 'wave2' || phase === 'cleared') {
        const status = hasCoat
          ? 'Шуба: да'
          : coat
            ? 'Шуба: на земле'
            : 'Шуба: украдена';
        const sw = measureUiText(ctx, status, 6.5, 550) + 10;
        uiPanel(
          ctx,
          width - sw - 4,
          36,
          sw,
          11,
          'rgba(16,12,28,0.85)',
          hasCoat ? 'rgba(64,200,120,0.7)' : 'rgba(224,112,64,0.7)',
        );
        drawUiText(ctx, status, width - sw, 38, hasCoat ? '#a0f0c0' : '#f0c0a0', 6.5, 550);
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
        const gw = measureUiText(ctx, 'Конец игры', 12, 700) + 24;
        uiPanel(
          ctx,
          Math.round((width - gw) / 2),
          Math.round(height / 2 - 24),
          gw,
          40,
          'rgba(20,10,14,0.92)',
          'rgba(224,64,64,0.8)',
        );
        drawUiTextCentered(ctx, 'Конец игры', width / 2, height / 2 - 16, '#f08080', 12, 700);
        drawUiTextCentered(ctx, 'Назад в 2026…', width / 2, height / 2 + 2, R.uiBorder, 7, 500);
      }

      if (phase === 'cleared') {
        ctx.fillStyle = 'rgba(4, 12, 8, 0.45)';
        ctx.fillRect(0, 0, width, height);
        const gw = measureUiText(ctx, 'Ур. 1 пройден', 12, 700) + 24;
        uiPanel(
          ctx,
          Math.round((width - gw) / 2),
          Math.round(height / 2 - 24),
          gw,
          44,
          'rgba(8,20,14,0.92)',
          'rgba(64,200,120,0.8)',
        );
        drawUiTextCentered(ctx, 'Ур. 1 пройден', width / 2, height / 2 - 16, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Шуба + лоток целы', width / 2, height / 2 + 4, R.uiBorder, 7, 500);
      }
    },

    /** Shared with TouchControls / canvas pointer hit-tests. */
    getDialogue(): DialogueSystem {
      return dialogue;
    },

    getQuiz(): QuizSystem {
      return quiz;
    },

    /** Dev / capture helpers (wired via main `__novgorod.rynok`). */
    __debug: {
      getPhase: () => phase,
      forceDialogue: () => beginMotherDialogue(),
      forceWave2Calm: () => {
        dialogue.resetSilent();
        quiz.closeSilent();
        motherPanic = 0.25;
        hasCoat = false;
        coat = null;
        phase = 'wave2';
        spawnWave2();
        player.x = 280;
        syncHud();
      },
      forceCoatDrop: () => {
        coat = { x: player.x + 30, y: FLOOR_Y - 6, taken: false };
        hasCoat = false;
        toast = 'ШУБА УПАЛА!';
        toastTimer = 1.2;
      },
      pickCoat: () => {
        if (coat) coat.taken = true;
        hasCoat = true;
        toast = 'ШУБА МАМЫ У ТЕБЯ';
        toastTimer = 1.2;
      },
      chooseSteady: () => {
        if (dialogue.isOpen) {
          if (!dialogue.revealComplete) dialogue.advance();
          dialogue.selectChoice(0);
        }
      },
      advanceDialogue: () => dialogue.advance(),
      skipToChoices: () => {
        if (!dialogue.isOpen) beginMotherDialogue();
        dialogue.advance();
        dialogue.advance();
        dialogue.advance();
      },
      answerCorrect: () => {
        if (!quiz.isOpen) return;
        for (let i = 0; i < 4; i++) {
          if (quiz.selectAnswer(i) === 'correct') break;
        }
      },
    },
  };
}

/* ───────────────────── Environment draws ───────────────────── */

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  fillSkyGradient(
    ctx,
    width,
    [
      { y: 0, h: 40, color: '#0c1424' },
      { y: 40, h: 28, color: '#182438' },
      { y: 68, h: 28, color: '#243048' },
      { y: 96, h: 36, color: '#304860' },
      { y: 132, h: height - 132, color: '#3c5068' },
    ],
    [
      { y: 39, a: '#0c1424', b: '#182438' },
      { y: 67, a: '#182438', b: '#243048' },
      { y: 95, a: '#243048', b: '#304860' },
      { y: 131, a: '#304860', b: '#3c5068' },
    ],
  );
}

/** Distant Novgorod Kremlin silhouette (slow parallax). */
function drawKremlinSilhouette(
  ctx: CanvasRenderingContext2D,
  width: number,
  scroll: number,
): void {
  const baseY = 78;
  for (let i = -1; i < 6; i++) {
    const bx = Math.round(i * 110 - (scroll % 110));
    px(ctx, bx, baseY + 18, 100, 28, '#141820');
    px(ctx, bx + 8, baseY, 16, 46, '#12161e');
    px(ctx, bx + 10, baseY - 8, 12, 10, '#1a2030');
    px(ctx, bx + 14, baseY - 18, 4, 12, '#222838');
    px(ctx, bx + 15, baseY - 22, 2, 6, '#2a3448');
    px(ctx, bx + 48, baseY + 4, 22, 42, '#12161e');
    px(ctx, bx + 52, baseY - 6, 14, 12, '#1a2030');
    px(ctx, bx + 56, baseY - 14, 6, 10, '#222838');
    px(ctx, bx + 78, baseY + 6, 18, 40, '#141820');
    px(ctx, bx + 82, baseY - 2, 10, 10, '#222840');
    if ((i + 3) % 2 === 0) {
      px(ctx, bx + 14, baseY + 20, 2, 2, '#d8b050');
      px(ctx, bx + 56, baseY + 24, 2, 2, '#b89840');
    }
  }
  ditherRect(ctx, 0, baseY + 40, width, 4, '#243040', '#304858');
}

/** Midground Центральный рынок — wavy arched roof + blue glass grid. */
function drawCentralMarketHall(
  ctx: CanvasRenderingContext2D,
  width: number,
  scroll: number,
): void {
  const baseY = 148;
  const hallH = 78;
  const topY = baseY - hallH;
  const span = 220;
  for (let i = -1; i < 4; i++) {
    const bx = Math.round(i * span - (scroll % span));
    drawMarketHallSegment(ctx, bx, topY, span - 4, hallH);
  }
  ditherRect(ctx, 0, baseY - 2, width, 6, '#344050', '#3c5068');
}

function drawMarketHallSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  w: number,
  h: number,
): void {
  px(ctx, x, topY + 18, w, h - 18, R.hallGlassDeep);
  drawWavyRoof(ctx, x - 2, topY, w + 4);
  const glassTop = topY + 20;
  const glassH = h - 22;
  px(ctx, x + 4, glassTop, w - 8, glassH, R.hallGlass);
  for (let col = 0; col < 10; col++) {
    const mx = x + 6 + col * Math.floor((w - 12) / 10);
    px(ctx, mx, glassTop, 2, glassH, R.hallFrame);
    const lit = col % 3 === 1;
    const paneW = Math.max(4, Math.floor((w - 12) / 10) - 3);
    px(
      ctx,
      mx + 2,
      glassTop + 4,
      paneW,
      glassH - 8,
      lit ? R.hallGlassLit : R.hallGlassHi,
    );
    px(ctx, mx + 3, glassTop + 6, Math.max(1, paneW - 4), 2, lit ? '#98c8e0' : '#5888a8');
    for (let row = 0; row < 4; row++) {
      px(ctx, mx + 2, glassTop + 6 + row * 14, paneW, 1, R.hallFrameDark);
    }
  }
  px(ctx, x + 2, glassTop, w - 4, 3, R.hallFrameHi);
  px(ctx, x + 2, glassTop + glassH - 3, w - 4, 3, R.hallFrame);
  px(ctx, x + 2, glassTop, 3, glassH, R.hallFrame);
  px(ctx, x + w - 5, glassTop, 3, glassH, R.hallFrame);

  const cx = x + Math.floor(w / 2) - 48;
  drawEntranceCanopy(ctx, cx, glassTop + glassH - 28);
}

function drawWavyRoof(ctx: CanvasRenderingContext2D, x: number, topY: number, w: number): void {
  const archW = Math.floor(w / 3);
  for (let a = 0; a < 3; a++) {
    const ax = x + a * archW;
    px(ctx, ax + 4, topY + 14, archW - 6, 8, R.hallRoofDark);
    px(ctx, ax + 10, topY + 8, archW - 18, 8, R.hallRoof);
    px(ctx, ax + 18, topY + 3, archW - 34, 8, R.hallRoofHi);
    px(ctx, ax + 26, topY, archW - 50, 6, R.hallRoofHi);
    px(ctx, ax + 16, topY + 1, archW - 30, 2, R.snowMid);
    px(ctx, ax + 24, topY - 1, Math.max(8, archW - 46), 2, R.snow);
  }
  px(ctx, x + archW - 4, topY + 10, 8, 6, R.hallRoofDark);
  px(ctx, x + archW * 2 - 4, topY + 10, 8, 6, R.hallRoofDark);
}

function drawEntranceCanopy(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, x, y, 96, 22, R.hallBannerDark);
  px(ctx, x + 2, y + 2, 92, 16, R.hallBanner);
  px(ctx, x + 2, y + 2, 92, 2, R.hallBannerHi);
  px(ctx, x + 8, y - 4, 80, 4, R.hallBanner);
  px(ctx, x + 20, y - 7, 56, 3, R.hallBannerHi);
  px(ctx, x + 16, y - 8, 20, 2, R.snow);
  drawNesTextCentered(ctx, 'ЦЕНТРАЛЬНЫЙ', x + 48, y + 6, R.hallSign, 1, 0);
  px(ctx, x + 6, y + 18, 26, 5, '#2a6840');
  drawNesText(ctx, 'ХЛЕБ', x + 9, y + 19, '#d0f0d0', 1, 0);
  px(ctx, x + 36, y + 18, 24, 5, '#781828');
  drawNesText(ctx, 'МЯСО', x + 39, y + 19, '#f0d0d0', 1, 0);
  px(ctx, x + 64, y + 18, 26, 5, '#284878');
  drawNesText(ctx, 'ЧАЙ', x + 70, y + 19, '#d0e0f0', 1, 0);
  px(ctx, x + 28, y + 24, 16, 10, '#141820');
  px(ctx, x + 52, y + 24, 16, 10, '#141820');
  px(ctx, x + 30, y + 26, 4, 4, '#3a5868');
  px(ctx, x + 54, y + 26, 4, 4, '#3a5868');
}

function drawMarketPlinth(ctx: CanvasRenderingContext2D, worldW: number): void {
  fillBricks(
    ctx,
    0,
    168,
    worldW,
    FLOOR_Y - 172,
    R.brickDark,
    R.mortar,
    R.brick,
    10,
    5,
    R.brickDeep,
  );
  px(ctx, 0, FLOOR_Y - 14, worldW, 10, R.concrete);
  px(ctx, 0, FLOOR_Y - 14, worldW, 2, R.concreteHi);
  px(ctx, 0, FLOOR_Y - 6, worldW, 2, R.concreteDark);
  for (let x = 0; x < worldW; x += 18) {
    px(ctx, x, FLOOR_Y - 12, 1, 6, R.concreteDark);
  }
  for (let x = 0; x < worldW; x += 24) {
    px(ctx, x, FLOOR_Y - 10, 20, 1, R.streetDark);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, worldW: number, height: number): void {
  px(ctx, 0, FLOOR_Y - 4, worldW, height - (FLOOR_Y - 4), R.street);
  ditherRect(ctx, 0, FLOOR_Y - 4, worldW, 4, R.streetHi, R.street);

  for (let x = 0; x < worldW; x += 10) {
    for (let y = FLOOR_Y + 2; y < height; y += 7) {
      const light = (x / 10 + y / 7) % 2 === 0;
      px(ctx, x, y, 10, 7, light ? R.snow : R.snowMid);
    }
  }
  px(ctx, 0, FLOOR_Y - 4, worldW, 4, R.snow);
  px(ctx, 0, FLOOR_Y - 4, worldW, 1, R.snowHi);
  px(ctx, 0, FLOOR_Y, worldW, 2, R.snowShadow);

  ctx.fillStyle = R.snowDeep;
  for (let x = 10; x < worldW; x += 20) {
    ctx.fillRect(x, FLOOR_Y + 10, 4, 1);
    ctx.fillRect(x + 6, FLOOR_Y + 16, 3, 1);
    ctx.fillRect(x + 2, FLOOR_Y + 22, 2, 1);
  }
  for (let x = 40; x < worldW; x += 70) {
    px(ctx, x, FLOOR_Y + 6, 18, 3, R.snowShadow);
    px(ctx, x + 2, FLOOR_Y + 7, 14, 1, R.streetDark);
  }
}

function drawBlueFence(ctx: CanvasRenderingContext2D, x: number, floorY: number, w: number): void {
  px(ctx, x, floorY - 18, w, 2, R.fenceHi);
  px(ctx, x, floorY - 4, w, 2, R.fence);
  for (let i = 0; i < w; i += 6) {
    px(ctx, x + i, floorY - 18, 2, 16, R.fence);
    px(ctx, x + i, floorY - 18, 1, 16, R.fenceHi);
  }
  px(ctx, x, floorY - 19, w, 1, R.snowMid);
}

function drawSnowPile(ctx: CanvasRenderingContext2D, x: number, floorY: number, w: number): void {
  px(ctx, x, floorY - 6, w, 6, R.snowMid);
  px(ctx, x + 4, floorY - 10, w - 8, 6, R.snow);
  px(ctx, x + 10, floorY - 13, Math.max(6, w - 20), 4, R.snowHi);
  px(ctx, x + 2, floorY - 2, w - 4, 2, R.snowShadow);
  px(ctx, x + 6, floorY - 4, 4, 1, R.streetDark);
}

function kioskColors(theme: KioskTheme): { body: string; hi: string; dark: string; roof: string } {
  if (theme === 'tan') {
    return { body: R.kioskTan, hi: R.kioskTanHi, dark: R.kioskTanDark, roof: R.kioskRust };
  }
  if (theme === 'rust') {
    return { body: R.kioskRust, hi: R.kioskRustHi, dark: R.kioskRustDark, roof: R.kioskGreyDark };
  }
  if (theme === 'blue') {
    return { body: R.kioskGrey, hi: R.kioskGreyHi, dark: R.kioskGreyDark, roof: R.kioskBlue };
  }
  if (theme === 'green') {
    return { body: '#3a4830', hi: '#5a6848', dark: '#2a3420', roof: '#2a5840' };
  }
  return { body: R.kioskGrey, hi: R.kioskGreyHi, dark: R.kioskGreyDark, roof: R.kioskGreyDark };
}

/** Open-air goods stall with corrugated sides + table goods. */
function drawGoodsStall(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  label: string,
  theme: KioskTheme,
  goods: StallDef['goods'],
): void {
  const c = kioskColors(theme);
  const w = 64;
  const h = 40;
  // Awning
  px(ctx, x - 2, floorY - h - 8, w + 4, 8, c.roof);
  px(ctx, x - 2, floorY - h - 8, w + 4, 2, R.kioskBlueHi);
  for (let i = 0; i < w + 4; i += 4) {
    px(ctx, x - 2 + i, floorY - h - 7, 2, 6, theme === 'green' ? '#1a4030' : R.kioskBlue);
  }
  px(ctx, x + 6, floorY - h - 10, 14, 2, R.snow);
  px(ctx, x + 34, floorY - h - 10, 10, 2, R.snowMid);
  // Counter body
  px(ctx, x, floorY - h, w, h, c.body);
  for (let i = 0; i < w; i += 3) {
    px(ctx, x + i, floorY - h, 1, h, c.hi);
    if (i % 6 === 0) px(ctx, x + i + 1, floorY - h, 1, h, c.dark);
  }
  // Counter top + goods shelf
  woodGrain(ctx, x + 4, floorY - 20, w - 8, 5, R.wood, R.woodHi, R.wood, R.woodDark, false);
  px(ctx, x + 4, floorY - 16, w - 8, 2, R.woodDark);
  // Goods by type
  if (goods === 'bread') {
    px(ctx, x + 10, floorY - 28, 8, 5, R.bread);
    px(ctx, x + 12, floorY - 29, 5, 2, R.breadHi);
    px(ctx, x + 22, floorY - 27, 10, 4, R.bread);
    px(ctx, x + 24, floorY - 28, 6, 2, R.breadHi);
    px(ctx, x + 36, floorY - 28, 7, 5, '#c09050');
    px(ctx, x + 38, floorY - 29, 4, 2, '#e0b070');
  } else if (goods === 'fish') {
    px(ctx, x + 12, floorY - 27, 14, 4, R.fish);
    px(ctx, x + 14, floorY - 28, 8, 2, R.fishHi);
    px(ctx, x + 28, floorY - 26, 12, 3, '#6a8090');
    px(ctx, x + 30, floorY - 27, 6, 2, '#90a8b8');
    px(ctx, x + 42, floorY - 28, 10, 4, R.fish);
    // Ice chips
    px(ctx, x + 16, floorY - 24, 2, 1, R.snowHi);
    px(ctx, x + 34, floorY - 23, 2, 1, R.snow);
  } else if (goods === 'seeds') {
    px(ctx, x + 10, floorY - 28, 12, 8, '#5a4030');
    px(ctx, x + 12, floorY - 27, 8, 5, '#8a6840');
    speckles(ctx, x + 12, floorY - 27, 8, 5, '#c8a060', 4, 2);
    px(ctx, x + 28, floorY - 28, 10, 8, '#4a3828');
    px(ctx, x + 30, floorY - 26, 6, 4, '#a08050');
    speckles(ctx, x + 30, floorY - 26, 6, 4, '#e0c080', 3, 1);
    px(ctx, x + 42, floorY - 27, 8, 6, '#3a2820');
    speckles(ctx, x + 43, floorY - 26, 6, 4, '#c8a870', 3, 3);
  } else if (goods === 'veg') {
    px(ctx, x + 10, floorY - 28, 6, 6, '#c05030');
    px(ctx, x + 12, floorY - 29, 3, 2, '#e07050');
    px(ctx, x + 20, floorY - 27, 7, 5, '#d8a040');
    px(ctx, x + 22, floorY - 28, 4, 2, '#f0c060');
    px(ctx, x + 32, floorY - 28, 5, 6, '#408040');
    px(ctx, x + 34, floorY - 29, 2, 2, '#60a060');
    px(ctx, x + 42, floorY - 27, 8, 5, '#a04030');
    px(ctx, x + 44, floorY - 28, 4, 2, '#c06048');
  }
  // Sign
  const sw = measureNesText(label, 1, 0) + 6;
  segaBox(ctx, x + Math.floor((w - sw) / 2), floorY - h - 20, sw, 11, R.uiBox, R.awningStripe, {
    borderDark: R.woodDeep,
    inset: false,
  });
  drawNesTextCentered(ctx, label, x + w / 2, floorY - h - 17, R.uiText, 1, 0);
}

/** Mother’s МЕХА / furs kiosk — keeps interact hotspot geometry. */
function drawMotherKiosk(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  const w = MOTHER_STALL_W;
  const h = 48;
  const c = kioskColors('rust');
  px(ctx, x, floorY - h, w, h, c.body);
  for (let i = 0; i < w; i += 3) {
    px(ctx, x + i, floorY - h, 1, h, c.hi);
    if (i % 6 === 0) px(ctx, x + i + 1, floorY - h, 1, h, c.dark);
  }
  px(ctx, x - 3, floorY - h - 7, w + 6, 7, R.kioskBlue);
  px(ctx, x - 3, floorY - h - 7, w + 6, 2, R.kioskBlueHi);
  for (let i = 0; i < w + 6; i += 4) {
    px(ctx, x - 3 + i, floorY - h - 6, 2, 5, R.kioskBlueDark);
  }
  px(ctx, x + 8, floorY - h - 9, 16, 2, R.snow);
  px(ctx, x + 40, floorY - h - 9, 12, 2, R.snowMid);
  px(ctx, x + 6, floorY - 40, w - 12, 22, '#1a1010');
  const furs = [
    [10, -38, 14, 16, R.fur, R.furHi],
    [28, -36, 12, 14, R.furDark, R.fur],
    [44, -38, 10, 16, R.fur, R.furHi],
  ] as const;
  for (const [fx, fy, fw, fh, c0, c1] of furs) {
    px(ctx, x + fx, floorY + fy, fw, fh, c0);
    px(ctx, x + fx + 2, floorY + fy + 2, fw - 4, 3, c1);
    speckles(ctx, x + fx, floorY + fy, fw, fh, R.furDark, 3, fx);
    px(ctx, x + fx + 3, floorY + fy, 2, 1, '#2a1810');
  }
  woodGrain(ctx, x + 4, floorY - 18, w - 8, 5, R.wood, R.woodHi, R.wood, R.woodDark, false);
  px(ctx, x + 4, floorY - 14, w - 8, 2, R.woodDark);
  segaBox(ctx, x + 14, floorY - h - 20, 40, 12, R.uiBox, R.awningBrownHi, {
    borderDark: R.woodDeep,
    inset: false,
  });
  drawNesTextCentered(ctx, 'МЕХА', x + w / 2, floorY - h - 16, R.uiText, 1, 1);
}

/** Ambient seller behind a non-mother stall (decorative, non-combat). */
function drawStallSeller(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  kind: StallDef['seller'],
  t: number,
): void {
  const ox = Math.round(x);
  const oy = Math.round(floorY);
  const bob = Math.sin(t * 2.2 + x * 0.05) > 0.6 ? 1 : 0;
  const coat =
    kind === 'aunt' ? '#6a4050' : kind === 'woman' ? '#485868' : '#3a4838';
  const coatH =
    kind === 'aunt' ? '#8a5868' : kind === 'woman' ? '#688088' : '#5a6850';
  // Body behind counter
  px(ctx, ox - 5, oy - 34 + bob, 10, 14, coat);
  px(ctx, ox - 4, oy - 32 + bob, 3, 4, coatH);
  // Head
  px(ctx, ox - 4, oy - 42 + bob, 8, 8, '#d0a878');
  px(ctx, ox - 3, oy - 41 + bob, 2, 2, '#e8c898');
  if (kind === 'aunt') {
    px(ctx, ox - 5, oy - 44 + bob, 10, 3, '#8a3040');
    px(ctx, ox - 6, oy - 42 + bob, 2, 5, '#8a3040');
  } else if (kind === 'woman') {
    px(ctx, ox - 5, oy - 44 + bob, 10, 3, '#2a2838');
    px(ctx, ox - 4, oy - 45 + bob, 8, 2, '#3a3848');
  } else {
    px(ctx, ox - 5, oy - 44 + bob, 10, 3, '#2a2420');
    px(ctx, ox - 4, oy - 45 + bob, 8, 2, '#4a4038');
  }
  px(ctx, ox - 2, oy - 38 + bob, 1, 1, '#181018');
  px(ctx, ox + 1, oy - 38 + bob, 1, 1, '#181018');
}

/** Mother behind МЕХА stall — photo face + fur-collar coat. */
function drawMother(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  panic: number,
): void {
  const ox = Math.round(x);
  const oy = Math.round(floorY);
  // Winter coat with fur collar
  px(ctx, ox - 7, oy - 32, 14, 20, '#6a4838');
  px(ctx, ox - 6, oy - 30, 5, 6, '#8a6850');
  px(ctx, ox + 1, oy - 28, 4, 8, '#5a3828');
  speckles(ctx, ox - 7, oy - 32, 14, 20, '#4a3020', 3, 2);
  px(ctx, ox - 6, oy - 32, 12, 3, '#c8a070');
  px(ctx, ox - 5, oy - 31, 10, 1, '#e0c090');
  speckles(ctx, ox - 6, oy - 32, 12, 3, '#a08060', 2, 1);
  // Headscarf frame under photo face
  px(ctx, ox - 6, oy - 44, 12, 4, '#4a3040');
  px(ctx, ox - 7, oy - 42, 2, 8, '#4a3040');
  px(ctx, ox + 5, oy - 42, 2, 8, '#3a2830');
  px(ctx, ox - 5, oy - 42, 10, 12, '#d0a878');
  // Photo-quality face from family portrait
  if (!drawFamilyFaceWithRim(ctx, 'mother', ox - 5, oy - 43, 10, 12)) {
    px(ctx, ox - 3, oy - 36, 2, 2, '#181018');
    px(ctx, ox + 1, oy - 36, 2, 2, '#181018');
    px(ctx, ox - 1, oy - 34, 2, 1, '#a87858');
  }
  if (panic > 0.5) {
    px(ctx, ox - 6, oy - 38, 1, 1, '#f0e0c0');
    px(ctx, ox + 5, oy - 38, 1, 1, '#f0e0c0');
  }
  // Arms
  if (panic > 0.55) {
    px(ctx, ox - 11, oy - 30, 4, 4, '#d0a878');
    px(ctx, ox + 7, oy - 32, 4, 4, '#d0a878');
    px(ctx, ox - 10, oy - 29, 2, 1, '#e8c898');
  } else {
    px(ctx, ox - 10, oy - 28, 3, 7, '#d0a878');
    px(ctx, ox + 7, oy - 28, 3, 7, '#d0a878');
    px(ctx, ox - 9, oy - 27, 1, 3, '#e8c898');
  }
  // Skirt / boots
  px(ctx, ox - 5, oy - 12, 4, 8, '#3a3048');
  px(ctx, ox + 1, oy - 12, 4, 8, '#3a3048');
  px(ctx, ox - 6, oy - 4, 5, 4, '#18141c');
  px(ctx, ox + 1, oy - 4, 5, 4, '#18141c');
  if (panic > 0.6) {
    px(ctx, ox + 6, oy - 40, 1, 2, '#80c0e0');
    drawNesText(ctx, '!', ox + 8, oy - 44, '#e04040', 1, 1);
  }
}

/** Stray mongrel — ambient, drawn before combatants. */
function drawDog(ctx: CanvasRenderingContext2D, d: AmbientDog, t: number): void {
  const ox = Math.round(d.x);
  const leg = Math.floor(t * 10 + d.phase * 3) % 2;
  const oy = Math.round(d.y) - (leg === 0 ? 0 : 1);
  const body = '#4a3a30';
  const bodyH = '#6a5848';
  const bodyD = '#2a2018';
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(d.facing, 1);
  // Drawn facing +X; scale flips for left
  px(ctx, -5, -8, 10, 5, body);
  px(ctx, -4, -9, 7, 2, bodyH);
  px(ctx, -3, -7, 5, 2, bodyD);
  px(ctx, 4, -10, 5, 4, body);
  px(ctx, 7, -9, 3, 2, bodyD);
  px(ctx, 5, -11, 2, 1, bodyH);
  px(ctx, 6, -9, 1, 1, '#181018');
  px(ctx, 4, -12, 2, 2, bodyD);
  px(ctx, -4, -3, 2, 3 + leg, bodyD);
  px(ctx, -1, -3, 2, 3 + (1 - leg), bodyD);
  px(ctx, 2, -3, 2, 3 + leg, bodyD);
  const tailUp = Math.sin(t * 8 + d.phase) > 0;
  px(ctx, -7, tailUp ? -10 : -8, 3, 2, bodyH);
  ctx.restore();
}

function drawCrates(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 10, 14, 10, R.crate);
  px(ctx, x + 1, floorY - 9, 12, 2, R.crateHi);
  px(ctx, x + 2, floorY - 6, 10, 1, R.crateDark);
  px(ctx, x + 12, floorY - 8, 12, 8, R.crateDark);
  px(ctx, x + 13, floorY - 7, 10, 1, R.crateHi);
  px(ctx, x + 4, floorY - 16, 12, 8, R.crateOrange);
  px(ctx, x + 5, floorY - 15, 10, 1, '#e08850');
  px(ctx, x + 16, floorY - 14, 10, 6, '#2a3038');
  px(ctx, x + 17, floorY - 13, 8, 1, '#485058');
}

function drawBusStop(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 36, 48, 3, R.kioskGreyDark);
  px(ctx, x + 2, floorY - 38, 44, 2, R.kioskGrey);
  px(ctx, x + 6, floorY - 40, 16, 2, R.snow);
  px(ctx, x + 2, floorY - 36, 3, 36, R.kioskGreyDark);
  px(ctx, x + 43, floorY - 36, 3, 36, R.kioskGreyDark);
  px(ctx, x + 6, floorY - 32, 16, 20, '#284858');
  px(ctx, x + 24, floorY - 32, 16, 20, '#304860');
  px(ctx, x + 8, floorY - 30, 12, 4, '#486878');
  px(ctx, x + 8, floorY - 12, 32, 3, R.kioskGrey);
  px(ctx, x + 8, floorY - 12, 32, 1, R.kioskGreyHi);
  px(ctx, x + 52, floorY - 44, 2, 44, R.concreteDark);
  px(ctx, x + 48, floorY - 48, 10, 10, R.hallBanner);
  px(ctx, x + 49, floorY - 47, 8, 2, R.hallBannerHi);
  drawNesText(ctx, 'А', x + 51, floorY - 44, R.hallSign, 1, 0);
}

function drawStreetLamp(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 70, 3, 70, R.concreteDark);
  px(ctx, x - 1, floorY - 72, 5, 4, R.concrete);
  px(ctx, x - 6, floorY - 76, 14, 5, R.kioskGreyDark);
  px(ctx, x - 4, floorY - 74, 10, 3, '#f0e0a0');
  px(ctx, x - 2, floorY - 73, 6, 1, '#fff8d0');
}

function drawCoatPickup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  px(ctx, ox - 8, oy - 4, 16, 6, '#6a4838');
  px(ctx, ox - 7, oy - 5, 14, 2, '#8a6850');
  px(ctx, ox - 6, oy - 2, 12, 2, '#4a3028');
  px(ctx, ox - 4, oy - 6, 4, 2, '#c8a070');
  if (Math.floor(performance.now() / 200) % 2 === 0) {
    px(ctx, ox + 6, oy - 7, 2, 2, '#f0e080');
  }
}

function drawGate(ctx: CanvasRenderingContext2D): void {
  px(ctx, 514, FLOOR_Y - 68, 12, 68, R.gate);
  px(ctx, 516, FLOOR_Y - 66, 2, 64, R.gateHi);
  px(ctx, 538, FLOOR_Y - 68, 12, 68, R.gate);
  px(ctx, 540, FLOOR_Y - 66, 2, 64, R.gateHi);
  px(ctx, 514, FLOOR_Y - 74, 36, 10, R.wood);
  px(ctx, 516, FLOOR_Y - 72, 32, 2, R.woodHi);
  px(ctx, 524, FLOOR_Y - 48, 16, 4, R.woodDark);
  px(ctx, 524, FLOOR_Y - 34, 16, 4, R.woodDark);
  px(ctx, 512, FLOOR_Y - 76, 40, 3, R.snow);
}

function drawSnowParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
): void {
  const t = performance.now() / 1000;
  for (let i = 0; i < 56; i++) {
    const sx = (i * 47 + Math.sin(t * 0.7 + i) * 12 + scroll * 0.35) % width;
    const sy = (i * 29 + t * (18 + (i % 7) * 7)) % height;
    const big = i % 4 === 0;
    ctx.fillStyle = big ? R.snowHi : i % 3 === 0 ? R.snow : R.snowMid;
    ctx.fillRect(Math.round(sx), Math.round(sy), big ? 2 : 1, big ? 2 : 1);
  }
}
