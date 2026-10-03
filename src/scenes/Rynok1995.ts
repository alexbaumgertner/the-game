/**
 * ERA_1995 — Level 1 “Novgorod Центральный рынок, Winter 1995” (Neo-Noir 16-bit).
 * Wave 1 → mid-fight father-stall timed dialogue → Wave 2 tracksuits → mother’s coat.
 * Midground = wavy blue-glass market hall; gameplay = kiosks / street / bus stop.
 * Parallax / lighting / Bazar / MF Game Over → apartment snap-back preserved.
 */

import type { StateManager } from '@/core/StateManager';
import { ART_SCALE, LOGICAL_WIDTH } from '@/core/Display';
import { BAZAR_COST, MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import { BazarBubble } from '@/entities/BazarBubble';
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
import { aabbOverlap } from '@/systems/CombatMath';
import { ParallaxStack } from '@/render/ParallaxLayer';
import {
  applyLightingOverlay,
  makeHeadlight,
  makeTrashFire,
  type ConeLight,
  type PointLight,
} from '@/render/LightingOverlay';
import {
  DialogueSystem,
  FATHER_STALL_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';

const FLOOR_Y = 188;
const R = RYNOK_PAL;
const WORLD_W = 560;
/** Father’s FURS stall X (awning left edge). */
const FATHER_STALL_X = 330;
const FATHER_STALL_W = 68;
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

interface StreetCar {
  x: number;
  y: number;
  facing: 1 | -1;
  speed: number;
  body: string;
  bodyHi: string;
}

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
  let bubbles: BazarBubble[] = [];
  let phase: LevelPhase = 'wave1';
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let cars: StreetCar[] = [];
  let fatherPanic = 1; // 0 calm … 1 panicked
  let hasCoat = false;
  let coat: CoatPickup | null = null;
  let winTimer = 0;
  let dialogueStarted = false;
  const dialogue = new DialogueSystem();

  const fireSpots: PointLight[] = [
    makeTrashFire(70, FLOOR_Y - 8, 0.2),
    makeTrashFire(250, FLOOR_Y - 6, 1.4),
    makeTrashFire(400, FLOOR_Y - 10, 2.8),
    makeTrashFire(510, FLOOR_Y - 8, 0.9),
  ];

  const spawnCars = (): void => {
    cars = [
      { x: -40, y: FLOOR_Y - 18, facing: 1, speed: 42, body: '#2a3040', bodyHi: '#4a5868' },
      { x: WORLD_W + 60, y: FLOOR_Y - 16, facing: -1, speed: 36, body: '#3a2828', bodyHi: '#5a4040' },
      { x: 180, y: FLOOR_Y - 17, facing: 1, speed: 28, body: '#243028', bodyHi: '#3a5040' },
    ];
  };

  const spawnWave1 = (): void => {
    gangsters = [
      new Gangster({ x: 200, y: FLOOR_Y, hp: 34 }),
      new Gangster({ x: 280, y: FLOOR_Y, hp: 30 }),
      new Gangster({ x: 380, y: FLOOR_Y, hp: 36 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = fatherPanic < 0.4 ? 0.82 : fatherPanic > 0.8 ? 1.15 : 1;
    const hpBonus = fatherPanic > 0.8 ? 6 : 0;
    gangsters = [
      new Gangster({
        x: 300,
        y: FLOOR_Y,
        hp: 38 + hpBonus,
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
        x: 460,
        y: FLOOR_Y,
        hp: 40 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 520,
        y: FLOOR_Y,
        hp: 32 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) g.speedMul = speedMul;
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Защити лоток отца';
    if (phase === 'dialogue') return 'Говори с отцом - таймер';
    if (phase === 'wave2') {
      if (!hasCoat) return 'Забери шубу + зачисти волну';
      return 'Шуба есть - добей гопников';
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
    bubbles = [];
    coat = null;
    hasCoat = false;
    phase = 'gameover';
    gameOverTimer = 0;
    if (dialogue.isOpen) dialogue.close();
    player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
    states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.55 });
  };

  const nearFatherStall = (): boolean => {
    const cx = FATHER_STALL_X + FATHER_STALL_W / 2;
    return Math.abs(player.x - cx) < 55;
  };

  const beginFatherDialogue = (): void => {
    if (dialogueStarted || dialogue.isOpen) return;
    dialogueStarted = true;
    phase = 'dialogue';
    // Freeze remaining wave-1 thugs by clearing — mid-fight cut to stall talk
    gangsters = [];
    bubbles = [];
    player.vx = 0;
    toast = 'ОТЕЦ ЗОВЁТ';
    toastTimer = 1.2;
    dialogue.open(FATHER_STALL_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_father') {
      fatherPanic = 0.25;
      toast = 'ОТЕЦ УСПОКОИЛСЯ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      fatherPanic = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - ПАНИКА' : 'ПУСТЫЕ СЛОВА - СД';
      toastTimer = 1.6;
    } else {
      fatherPanic = 0.7;
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

  const headlightCones = (): ConeLight[] =>
    cars.map((c) =>
      makeHeadlight(
        c.x + (c.facing > 0 ? 22 : -22),
        c.y + 6,
        c.facing,
        88,
        12,
      ),
    );

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
    drawSnowPile(ctx, 470, FLOOR_Y, 30);
    drawTrashCan(ctx, 62, FLOOR_Y);
    drawTrashCan(ctx, 242, FLOOR_Y);
    drawTrashCan(ctx, 392, FLOOR_Y);
    drawTrashCan(ctx, 502, FLOOR_Y);
    // Period corrugated kiosks (replaces generic FISH/BREAD strip)
    drawKiosk(ctx, 96, FLOOR_Y, 'ХЛЕБ', 'tan');
    drawKiosk(ctx, 200, FLOOR_Y, 'РЫБА', 'grey');
    // Father’s МЕХА stall — same hotspot X as legacy FURS
    drawFatherKiosk(ctx, FATHER_STALL_X, FLOOR_Y);
    drawFather(ctx, FATHER_STALL_X + 34, FLOOR_Y, fatherPanic);
    drawCrates(ctx, 168, FLOOR_Y);
    drawCrates(ctx, 410, FLOOR_Y);
    drawBusStop(ctx, 440, FLOOR_Y);
    drawStreetLamp(ctx, 300, FLOOR_Y);
    drawGate(ctx);
    for (const c of cars) drawCar(ctx, c);
    if (coat && !coat.taken) drawCoatPickup(ctx, coat.x, coat.y);
    for (const g of gangsters) g.render(ctx, alpha);
    for (const b of bubbles) b.render(ctx);
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
            // Higher ambient floor + lower multiply strength — readable night, not crushed
            ambient: { color: 'rgba(40, 44, 74, 0.52)' },
            points: fireSpots,
            cones: headlightCones(),
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
      player.setEra('teen');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = 60;
      player.setFloorY(FLOOR_Y);
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 60;
      camX = 0;
      bubbles = [];
      phase = 'wave1';
      gameOverTimer = 0;
      toast = '';
      toastTimer = 0;
      time = 0;
      shake = 0;
      fatherPanic = 1;
      hasCoat = false;
      coat = null;
      winTimer = 0;
      dialogueStarted = false;
      dialogue.resetSilent();
      spawnWave1();
      spawnCars();
      syncHud('Защити лоток отца');
    },

    exit(): void {
      gangsters = [];
      bubbles = [];
      cars = [];
      coat = null;
      dialogue.resetSilent();
      hud.set({ showSwagger: false });
    },

    update(dt: number): void {
      time += dt;
      if (shake > 0) shake = Math.max(0, shake - dt);
      if (player.bazarShake > 0) {
        shake = Math.max(shake, player.bazarShake);
      }

      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toast = '';
      }

      for (const c of cars) {
        c.x += c.facing * c.speed * dt;
        if (c.facing > 0 && c.x > WORLD_W + 80) c.x = -60;
        if (c.facing < 0 && c.x < -80) c.x = WORLD_W + 60;
      }

      // ── Dialogue modal: pause combat sim, feed input to DialogueSystem ──
      if (phase === 'dialogue' && dialogue.isOpen) {
        dialogue.update(dt);
        player.update(dt);
        const input = states.input;
        if (input) {
          if (dialogue.hasChoices) {
            if (input.justPressed('choice1') || input.justPressed('punch')) {
              dialogue.selectChoice(0);
            } else if (input.justPressed('choice2') || input.justPressed('kick')) {
              dialogue.selectChoice(1);
            }
          } else if (
            input.justPressed('confirm') ||
            input.justPressed('punch') ||
            input.justPressed('interact')
          ) {
            dialogue.advance();
          }
        }
        // Slow panic bob while talking
        fatherPanic = Math.min(1, fatherPanic + dt * 0.02);
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
          // Soft return to apartment with progress kept (combat meters reset)
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.65 });
        }
        return;
      }

      player.update(dt);
      const input = states.input;

      if (input && !player.isKo) {
        if (input.justPressed('jump')) player.tryJump();
        if (input.justPressed('punch')) player.tryPunch();
        if (input.justPressed('kick')) player.tryKick();
        if (input.justPressed('special')) {
          const bubble = player.tryBazar();
          if (bubble) {
            bubbles.push(bubble);
            toast = bubble.phrase;
            toastTimer = 0.9;
            shake = Math.max(shake, 0.28);
          } else if (player.streetSwagger < BAZAR_COST) {
            toast = `НУЖНО ${BAZAR_COST} ПОНТА`;
            toastTimer = 0.7;
          }
        }

        const axis = input.axisX();
        player.applyWalk(axis, dt, 20, WORLD_W - 20);
      }

      player.applyPhysics(dt, 20, WORLD_W - 20);

      const atk = player.attackHitbox();
      if (atk) {
        for (const g of gangsters) {
          if (g.isKo) continue;
          if (aabbOverlap(atk, g.body())) {
            const dmg = player.animState === 'teen_kick' ? 14 : 10;
            const swag = player.animState === 'teen_kick' ? 18 : 12;
            g.takeHit(dmg, player.facing);
            player.addSwagger(swag);
            player.markAttackConnected();
            break;
          }
        }
      }

      for (const b of bubbles) {
        b.update(dt);
        if (!b.canHit) continue;
        const hb = b.hitbox();
        for (const g of gangsters) {
          if (g.isKo) continue;
          if (aabbOverlap(hb, g.body())) {
            g.takeBazarStun(b.facing);
            player.addSwagger(6);
            b.markHit();
            toast = b.phrase;
            toastTimer = 0.9;
            break;
          }
        }
      }
      bubbles = bubbles.filter((b) => b.alive);

      for (const g of gangsters) {
        g.update(dt, player.x, player.y, FLOOR_Y, 30, WORLD_W - 30);
        const drop = g.consumeCoatDrop();
        if (drop && !coat) {
          coat = { x: drop.x, y: drop.y, taken: false };
          toast = 'ШУБА УПАЛА!';
          toastTimer = 1.2;
        }
        if (player.invuln > 0 || player.isKo || g.isKo) continue;
        const ah = g.attackHitbox();
        if (ah && aabbOverlap(ah, player.body())) {
          const dmg = g.consumeAttackHit();
          if (dmg > 0) {
            const scaled = fatherPanic > 0.8 ? dmg + 3 : dmg;
            player.takeDamage(scaled, g.facing);
          }
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
          fatherPanic = Math.max(0.15, fatherPanic - 0.35);
        }
      }

      if (player.isKo) {
        phase = 'gameover';
        gameOverTimer = 1.8;
        toast = 'СИЛА ДУХА СЛОМЛЕНА';
        toastTimer = 1.8;
      }

      const alive = gangsters.filter((g) => !g.isKo).length;

      // Mid-fight: reach father stall with ≥1 KO, or clear wave 1 entirely
      if (phase === 'wave1' && !dialogueStarted) {
        const anyKo = gangsters.some((g) => g.isKo);
        if ((nearFatherStall() && anyKo) || alive === 0) {
          // Nudge player toward stall feel
          beginFatherDialogue();
        } else {
          syncHud(
            alive === 1
              ? 'Один гопник - к отцу'
              : `Волна 1 · Гопники ${alive} · К МЕХА`,
          );
        }
      } else if (phase === 'wave2') {
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

      // Level title in HUD top-right — avoid center-panel overlap

      if (phase === 'dialogue' && dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      } else {
        const hint =
          phase === 'wave2' && !hasCoat
            ? 'J удар · K нога · L базар · Забери шубу'
            : 'J удар · K нога · L базар · Пробел — прыжок';
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

    /** Dev / capture helpers (wired via main `__novgorod.rynok`). */
    __debug: {
      getPhase: () => phase,
      forceDialogue: () => beginFatherDialogue(),
      forceWave2Calm: () => {
        dialogue.resetSilent();
        fatherPanic = 0.25;
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
        if (!dialogue.isOpen) beginFatherDialogue();
        // Advance through intro typewriter + line
        dialogue.advance();
        dialogue.advance();
        dialogue.advance();
      },
    },
  };
}

/* ───────────────────── Environment draws ───────────────────── */

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Neo-Noir winter sky — slightly brighter mid bands, still night
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
    // Wall mass — silhouette kept dark; mid edges lifted for depth vs sky
    px(ctx, bx, baseY + 18, 100, 28, '#141820');
    // Towers
    px(ctx, bx + 8, baseY, 16, 46, '#12161e');
    px(ctx, bx + 10, baseY - 8, 12, 10, '#1a2030');
    // Spire
    px(ctx, bx + 14, baseY - 18, 4, 12, '#222838');
    px(ctx, bx + 15, baseY - 22, 2, 6, '#2a3448');
    px(ctx, bx + 48, baseY + 4, 22, 42, '#12161e');
    px(ctx, bx + 52, baseY - 6, 14, 12, '#1a2030');
    px(ctx, bx + 56, baseY - 14, 6, 10, '#222838');
    // Dome hint
    px(ctx, bx + 78, baseY + 6, 18, 40, '#141820');
    px(ctx, bx + 82, baseY - 2, 10, 10, '#222840');
    // Tiny lit windows
    if ((i + 3) % 2 === 0) {
      px(ctx, bx + 14, baseY + 20, 2, 2, '#d8b050');
      px(ctx, bx + 56, baseY + 24, 2, 2, '#b89840');
    }
  }
  // Horizon mist band
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
  // Wide repeating facade segments so parallax scrolls cleanly
  const span = 220;
  for (let i = -1; i < 4; i++) {
    const bx = Math.round(i * span - (scroll % span));
    drawMarketHallSegment(ctx, bx, topY, span - 4, hallH);
  }
  // Soft ground fog under hall
  ditherRect(ctx, 0, baseY - 2, width, 6, '#344050', '#3c5068');
}

function drawMarketHallSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  w: number,
  h: number,
): void {
  // Concrete mass behind glass
  px(ctx, x, topY + 18, w, h - 18, R.hallGlassDeep);
  // Triple-arch / wavy roof silhouette
  drawWavyRoof(ctx, x - 2, topY, w + 4);
  // Blue metal frame + glass grid
  const glassTop = topY + 20;
  const glassH = h - 22;
  px(ctx, x + 4, glassTop, w - 8, glassH, R.hallGlass);
  // Vertical mullions
  for (let col = 0; col < 10; col++) {
    const mx = x + 6 + col * Math.floor((w - 12) / 10);
    px(ctx, mx, glassTop, 2, glassH, R.hallFrame);
    // Lit / cold panes with specular highlight
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
    // Horizontal bars
    for (let row = 0; row < 4; row++) {
      px(ctx, mx + 2, glassTop + 6 + row * 14, paneW, 1, R.hallFrameDark);
    }
  }
  // Outer frame rails
  px(ctx, x + 2, glassTop, w - 4, 3, R.hallFrameHi);
  px(ctx, x + 2, glassTop + glassH - 3, w - 4, 3, R.hallFrame);
  px(ctx, x + 2, glassTop, 3, glassH, R.hallFrame);
  px(ctx, x + w - 5, glassTop, 3, glassH, R.hallFrame);

  // Entrance canopy (center of segment)
  const cx = x + Math.floor(w / 2) - 48;
  drawEntranceCanopy(ctx, cx, glassTop + glassH - 28);
}

function drawWavyRoof(ctx: CanvasRenderingContext2D, x: number, topY: number, w: number): void {
  // Three concrete arches — recognizable Central Market silhouette
  const archW = Math.floor(w / 3);
  for (let a = 0; a < 3; a++) {
    const ax = x + a * archW;
    // Arch mass steps (pixel “wave”)
    px(ctx, ax + 4, topY + 14, archW - 6, 8, R.hallRoofDark);
    px(ctx, ax + 10, topY + 8, archW - 18, 8, R.hallRoof);
    px(ctx, ax + 18, topY + 3, archW - 34, 8, R.hallRoofHi);
    px(ctx, ax + 26, topY, archW - 50, 6, R.hallRoofHi);
    // Snow cap
    px(ctx, ax + 16, topY + 1, archW - 30, 2, R.snowMid);
    px(ctx, ax + 24, topY - 1, Math.max(8, archW - 46), 2, R.snow);
  }
  // V-notches between arches
  px(ctx, x + archW - 4, topY + 10, 8, 6, R.hallRoofDark);
  px(ctx, x + archW * 2 - 4, topY + 10, 8, 6, R.hallRoofDark);
}

function drawEntranceCanopy(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Blue box canopy with ЦЕНТРАЛЬНЫЙ banner
  px(ctx, x, y, 96, 22, R.hallBannerDark);
  px(ctx, x + 2, y + 2, 92, 16, R.hallBanner);
  px(ctx, x + 2, y + 2, 92, 2, R.hallBannerHi);
  // Peaked lip
  px(ctx, x + 8, y - 4, 80, 4, R.hallBanner);
  px(ctx, x + 20, y - 7, 56, 3, R.hallBannerHi);
  px(ctx, x + 16, y - 8, 20, 2, R.snow);
  // Big Cyrillic sign
  drawNesTextCentered(ctx, 'ЦЕНТРАЛЬНЫЙ', x + 48, y + 6, R.hallSign, 1, 0);
  // Period-plausible invented shop strips (not modern trademarks)
  px(ctx, x + 6, y + 18, 26, 5, '#2a6840');
  drawNesText(ctx, 'ХЛЕБ', x + 9, y + 19, '#d0f0d0', 1, 0);
  px(ctx, x + 36, y + 18, 24, 5, '#781828');
  drawNesText(ctx, 'МЯСО', x + 39, y + 19, '#f0d0d0', 1, 0);
  px(ctx, x + 64, y + 18, 26, 5, '#284878');
  drawNesText(ctx, 'ЧАЙ', x + 70, y + 19, '#d0e0f0', 1, 0);
  // Dark doors under canopy
  px(ctx, x + 28, y + 24, 16, 10, '#141820');
  px(ctx, x + 52, y + 24, 16, 10, '#141820');
  px(ctx, x + 30, y + 26, 4, 4, '#3a5868');
  px(ctx, x + 54, y + 26, 4, 4, '#3a5868');
}

/** Low plinth / asphalt apron under the hall (replaces full brick wall). */
function drawMarketPlinth(ctx: CanvasRenderingContext2D, worldW: number): void {
  // Hint of brick / concrete base behind kiosks
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
  // Tile/asphalt seam
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
  // Snow on rail
  px(ctx, x, floorY - 19, w, 1, R.snowMid);
}

function drawSnowPile(ctx: CanvasRenderingContext2D, x: number, floorY: number, w: number): void {
  px(ctx, x, floorY - 6, w, 6, R.snowMid);
  px(ctx, x + 4, floorY - 10, w - 8, 6, R.snow);
  px(ctx, x + 10, floorY - 13, Math.max(6, w - 20), 4, R.snowHi);
  px(ctx, x + 2, floorY - 2, w - 4, 2, R.snowShadow);
  px(ctx, x + 6, floorY - 4, 4, 1, R.streetDark);
}

function drawTrashCan(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 16, 14, 16, '#2a2820');
  px(ctx, x + 1, floorY - 15, 12, 2, '#4a4838');
  px(ctx, x + 2, floorY - 18, 10, 3, '#3a3830');
  // Embers (base color; lighting overlay adds glow)
  px(ctx, x + 4, floorY - 20, 2, 2, '#ff6820');
  px(ctx, x + 7, floorY - 22, 2, 3, '#ff9030');
  px(ctx, x + 5, floorY - 24, 1, 2, '#ffe080');
}

function drawCar(ctx: CanvasRenderingContext2D, c: StreetCar): void {
  const x = Math.round(c.x);
  const y = Math.round(c.y);
  // Body
  px(ctx, x - 18, y, 36, 12, c.body);
  px(ctx, x - 14, y - 8, 28, 8, c.body);
  px(ctx, x - 12, y - 7, 24, 2, c.bodyHi);
  // Cabin glass
  px(ctx, x - 8, y - 6, 10, 5, '#283848');
  px(ctx, x + 2, y - 6, 8, 5, '#283848');
  // Wheels
  px(ctx, x - 12, y + 10, 6, 4, '#0c0c10');
  px(ctx, x + 6, y + 10, 6, 4, '#0c0c10');
  // Headlamp bulb
  const lx = c.facing > 0 ? x + 17 : x - 20;
  px(ctx, lx, y + 4, 4, 3, '#f8f0d0');
  px(ctx, lx, y + 4, 4, 1, '#ffffff');
  // Tail
  const tx = c.facing > 0 ? x - 18 : x + 15;
  px(ctx, tx, y + 4, 3, 2, '#a02828');
}

type KioskTheme = 'tan' | 'grey' | 'rust' | 'blue';

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
  return { body: R.kioskGrey, hi: R.kioskGreyHi, dark: R.kioskGreyDark, roof: R.kioskGreyDark };
}

/** Corrugated metal street kiosk (1990s rynok) — denser corrugation + goods. */
function drawKiosk(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  label: string,
  theme: KioskTheme,
): void {
  const c = kioskColors(theme);
  const w = 64;
  const h = 44;
  px(ctx, x, floorY - h, w, h, c.body);
  for (let i = 0; i < w; i += 3) {
    px(ctx, x + i, floorY - h, 1, h, c.hi);
    if (i % 6 === 0) px(ctx, x + i + 1, floorY - h, 1, h, c.dark);
  }
  px(ctx, x, floorY - h, w, 2, c.dark);
  px(ctx, x, floorY - 2, w, 2, c.dark);
  px(ctx, x - 2, floorY - h - 6, w + 4, 6, c.roof);
  px(ctx, x - 2, floorY - h - 6, w + 4, 2, R.kioskBlueHi);
  for (let i = 0; i < w + 4; i += 4) {
    px(ctx, x - 2 + i, floorY - h - 5, 2, 4, R.kioskBlue);
  }
  px(ctx, x + 4, floorY - h - 8, 18, 2, R.snow);
  px(ctx, x + 36, floorY - h - 8, 12, 2, R.snowMid);
  px(ctx, x + 10, floorY - 34, 28, 16, '#1c2838');
  px(ctx, x + 12, floorY - 32, 24, 4, '#4a6880');
  px(ctx, x + 12, floorY - 26, 24, 6, '#283848');
  px(ctx, x + 14, floorY - 30, 8, 2, '#6890a8');
  if (theme === 'tan') {
    px(ctx, x + 14, floorY - 24, 6, 3, R.bread);
    px(ctx, x + 22, floorY - 25, 8, 4, R.breadHi);
  } else if (theme === 'grey') {
    px(ctx, x + 14, floorY - 24, 8, 3, R.fish);
    px(ctx, x + 24, floorY - 23, 6, 2, R.fishHi);
  }
  woodGrain(ctx, x + 6, floorY - 18, 40, 4, R.wood, R.woodHi, R.wood, R.woodDark, false);
  const sw = measureNesText(label, 1, 0) + 6;
  segaBox(ctx, x + Math.floor((w - sw) / 2), floorY - h - 18, sw, 11, R.uiBox, R.awningStripe, {
    borderDark: R.woodDeep,
    inset: false,
  });
  drawNesTextCentered(ctx, label, x + w / 2, floorY - h - 15, R.uiText, 1, 0);
}

/** Father’s МЕХА / furs kiosk — keeps interact hotspot geometry. */
function drawFatherKiosk(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  const w = FATHER_STALL_W;
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

function drawCrates(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  // Stack of wooden + plastic crates (entrance clutter)
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
  // Period metal/glass shelter (heavier than modern glass cubes)
  px(ctx, x, floorY - 36, 48, 3, R.kioskGreyDark);
  px(ctx, x + 2, floorY - 38, 44, 2, R.kioskGrey);
  px(ctx, x + 6, floorY - 40, 16, 2, R.snow);
  // Posts
  px(ctx, x + 2, floorY - 36, 3, 36, R.kioskGreyDark);
  px(ctx, x + 43, floorY - 36, 3, 36, R.kioskGreyDark);
  // Glass panes
  px(ctx, x + 6, floorY - 32, 16, 20, '#284858');
  px(ctx, x + 24, floorY - 32, 16, 20, '#304860');
  px(ctx, x + 8, floorY - 30, 12, 4, '#486878');
  // Bench
  px(ctx, x + 8, floorY - 12, 32, 3, R.kioskGrey);
  px(ctx, x + 8, floorY - 12, 32, 1, R.kioskGreyHi);
  // Bus stop sign pole
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

function drawFather(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  panic: number,
): void {
  const ox = Math.round(x);
  const oy = Math.round(floorY);
  px(ctx, ox - 6, oy - 30, 12, 18, '#3a3048');
  px(ctx, ox - 5, oy - 28, 4, 5, '#5a4868');
  px(ctx, ox - 4, oy - 24, 3, 8, '#4a3858');
  px(ctx, ox + 2, oy - 26, 3, 6, '#2a2038');
  speckles(ctx, ox - 6, oy - 30, 12, 18, '#2a2038', 4, 2);
  px(ctx, ox - 5, oy - 38, 10, 9, '#d0a878');
  px(ctx, ox - 4, oy - 37, 3, 2, '#e8c898');
  px(ctx, ox + 2, oy - 35, 2, 3, '#a87858');
  px(ctx, ox - 4, oy - 40, 8, 3, '#3a2830');
  px(ctx, ox - 3, oy - 40, 3, 1, '#4a3840');
  px(ctx, ox - 3, oy - 34, 2, 2, '#181018');
  px(ctx, ox + 1, oy - 34, 2, 2, '#181018');
  px(ctx, ox - 3, oy - 35, 2, 1, '#c8c0b0');
  px(ctx, ox + 1, oy - 35, 2, 1, '#c8c0b0');
  px(ctx, ox - 1, oy - 35, 2, 1, '#808890');
  if (panic > 0.5) {
    px(ctx, ox - 4, oy - 35, 1, 1, '#f0e0c0');
    px(ctx, ox + 4, oy - 35, 1, 1, '#f0e0c0');
  }
  px(ctx, ox - 1, oy - 32, 2, 1, '#a87858');
  px(ctx, ox - 2, oy - 30, 4, 1, panic > 0.55 ? '#603030' : '#806050');
  if (panic > 0.55) {
    px(ctx, ox - 10, oy - 26, 4, 4, '#d0a878');
    px(ctx, ox + 6, oy - 28, 4, 4, '#d0a878');
    px(ctx, ox - 9, oy - 25, 2, 1, '#e8c898');
  } else {
    px(ctx, ox - 9, oy - 22, 3, 7, '#d0a878');
    px(ctx, ox + 6, oy - 22, 3, 7, '#d0a878');
    px(ctx, ox - 8, oy - 21, 1, 3, '#e8c898');
  }
  px(ctx, ox - 5, oy - 12, 4, 12, '#2a2838');
  px(ctx, ox + 1, oy - 12, 4, 12, '#2a2838');
  px(ctx, ox - 5, oy - 12, 1, 8, '#3a3850');
  px(ctx, ox - 6, oy - 2, 5, 2, '#18141c');
  px(ctx, ox + 1, oy - 2, 5, 2, '#18141c');
  if (panic > 0.6) {
    px(ctx, ox + 6, oy - 38, 1, 2, '#80c0e0');
    drawNesText(ctx, '!', ox + 8, oy - 42, '#e04040', 1, 1);
  }
}

function drawCoatPickup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  // Folded fur coat on snow
  px(ctx, ox - 8, oy - 4, 16, 6, '#6a4838');
  px(ctx, ox - 7, oy - 5, 14, 2, '#8a6850');
  px(ctx, ox - 6, oy - 2, 12, 2, '#4a3028');
  px(ctx, ox - 4, oy - 6, 4, 2, '#c8a070'); // collar
  // Blink sparkle
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
