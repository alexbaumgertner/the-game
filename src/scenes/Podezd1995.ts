/**
 * ERA_1995 — Level 2 “Подъезд №7” (Khrushchyovka entrance / stairwell, Winter 1995).
 * Wave 1 entrance → mid-landing timed dialogue → Wave 2 upper landing → apartment door.
 */

import type { StateManager } from '@/core/StateManager';
import { ART_SCALE, LOGICAL_WIDTH } from '@/core/Display';
import { BAZAR_COST, MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import { BazarBubble } from '@/entities/BazarBubble';
import type { HUD } from '@/ui/HUD';
import type { BeerSystem } from '@/systems/BeerSystem';
import { PODEZD_PAL } from '@/art/segaPalette';
import { ditherRect, fillBricks, px, segaBox, speckles } from '@/art/pixelDraw';
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
  type ConeLight,
  type PointLight,
} from '@/render/LightingOverlay';
import {
  DialogueSystem,
  PODEZD_LANDING_SCRIPT,
  type DialogueEffect,
} from '@/systems/DialogueSystem';

const P = PODEZD_PAL;
const WORLD_W = 520;
/** Ground entrance floor. */
const GROUND_Y = 200;
const WRONG_REASSURE_MF_DRAIN = 22;
const DOOR_X = 470;
const DOOR_W = 28;

type LevelPhase = 'wave1' | 'dialogue' | 'wave2' | 'cleared' | 'gameover';

interface Platform {
  x: number;
  y: number;
  w: number;
}

/** Climb-friendly entrance → stairs → mid landing → upper landing. */
const PLATFORMS: readonly Platform[] = [
  { x: 0, y: GROUND_Y, w: 200 },
  { x: 155, y: 172, w: 70 },
  { x: 195, y: 144, w: 70 },
  { x: 235, y: 116, w: 150 }, // mid landing (dialogue)
  { x: 355, y: 88, w: 70 },
  { x: 395, y: 60, w: 125 }, // upper landing + door
];

const MID_LANDING_Y = 116;
const UPPER_Y = 60;

export interface PodezdSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: BeerSystem;
}

export function createPodezd1995Scene(deps: PodezdSceneDeps) {
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
  let motherFear = 1; // 0 calm … 1 scared
  let winTimer = 0;
  let dialogueStarted = false;
  let wave2Cleared = false;
  const dialogue = new DialogueSystem();

  /** Mother escort position (follows toward player, clamped to platforms). */
  let motherX = 48;
  let motherY = GROUND_Y;
  let motherFloor = GROUND_Y;

  /** Outdoor car headlights peeking through entrance (dim). */
  let carX = -30;
  let carFacing: 1 | -1 = 1;

  const bulbs: PointLight[] = [
    { kind: 'point', x: 70, y: 118, radius: 28, color: '#e8c868', phase: 0.2 },
    { kind: 'point', x: 280, y: 70, radius: 24, color: '#d8b858', phase: 1.1 },
    { kind: 'point', x: 440, y: 28, radius: 22, color: '#e0c060', phase: 2.0 },
  ];

  const spawnWave1 = (): void => {
    gangsters = [
      new Gangster({ x: 130, y: GROUND_Y, hp: 32 }),
      new Gangster({ x: 175, y: GROUND_Y, hp: 30 }),
    ];
  };

  const spawnWave2 = (): void => {
    const speedMul = motherFear < 0.4 ? 0.82 : motherFear > 0.8 ? 1.15 : 1;
    const hpBonus = motherFear > 0.8 ? 5 : 0;
    gangsters = [
      new Gangster({
        x: 420,
        y: UPPER_Y,
        hp: 36 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 460,
        y: UPPER_Y,
        hp: 34 + hpBonus,
        variant: 'tracksuit',
      }),
      new Gangster({
        x: 490,
        y: UPPER_Y,
        hp: 38 + hpBonus,
        variant: 'tracksuit',
      }),
    ];
    for (const g of gangsters) g.speedMul = speedMul;
  };

  const objectiveForPhase = (): string => {
    if (phase === 'wave1') return 'Зачисти вход - веди маму';
    if (phase === 'dialogue') return 'Разговор - крыша, таймер';
    if (phase === 'wave2') {
      if (!wave2Cleared) return 'Верхняя площадка - гопники';
      return 'Доберись до двери';
    }
    if (phase === 'cleared') return 'УР. 2 ПРОЙДЕН';
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
      levelTitle: 'Подъезд №7',
      objective: objective ?? objectiveForPhase(),
    });
  };

  const clearCombatAndReturn = (): void => {
    gangsters = [];
    bubbles = [];
    phase = 'gameover';
    gameOverTimer = 0;
    if (dialogue.isOpen) dialogue.close();
    player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
    states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.55 });
  };

  const nearMidLanding = (): boolean =>
    player.y <= MID_LANDING_Y + 6 && player.x >= 250 && player.x <= 360;

  const nearDoor = (): boolean =>
    player.y <= UPPER_Y + 6 &&
    player.x >= DOOR_X - 8 &&
    player.x <= DOOR_X + DOOR_W + 8;

  const beginLandingDialogue = (): void => {
    if (dialogueStarted || dialogue.isOpen) return;
    dialogueStarted = true;
    phase = 'dialogue';
    gangsters = [];
    bubbles = [];
    player.vx = 0;
    toast = 'КРЫША ТРЕБУЕТ';
    toastTimer = 1.2;
    dialogue.open(PODEZD_LANDING_SCRIPT, (_id, result) => {
      applyDialogueResult(result.effect, result.timedOut);
    });
    syncHud();
  };

  const applyDialogueResult = (effect: DialogueEffect, timedOut: boolean): void => {
    if (effect === 'calm_mother') {
      motherFear = 0.25;
      toast = 'МАМА ДЕРЖИТСЯ';
      toastTimer = 1.4;
    } else if (effect === 'wrong_reassure' || timedOut) {
      motherFear = 1;
      player.takeDamage(WRONG_REASSURE_MF_DRAIN, -1);
      player.vx = 0;
      toast = timedOut ? 'ПОЗДНО - СТРАХ' : 'ПУСТЫЕ СЛОВА - СД';
      toastTimer = 1.6;
    } else {
      motherFear = 0.7;
    }

    if (player.isKo) {
      phase = 'gameover';
      gameOverTimer = 1.8;
      syncHud('КОНЕЦ ИГРЫ');
      return;
    }

    phase = 'wave2';
    wave2Cleared = false;
    spawnWave2();
    // Nudge escort upstairs
    motherX = 400;
    motherY = UPPER_Y;
    motherFloor = UPPER_Y;
    if (player.y > UPPER_Y + 20) {
      player.x = 380;
      player.setFloorY(UPPER_Y);
      player.y = UPPER_Y;
      player.grounded = true;
    }
    syncHud();
  };

  const headlightCones = (): ConeLight[] => [
    {
      kind: 'headlight',
      x: carX + (carFacing > 0 ? 18 : -18),
      y: GROUND_Y - 12,
      facing: carFacing,
      length: 58,
      spread: 9,
      // Dim outdoor wash through the open entrance
      color: '#8890a8',
    },
  ];

  const updateMother = (dt: number): void => {
    // Soft follow toward player on similar floor, else climb toward mid/upper goal
    const targetX =
      phase === 'wave1'
        ? Math.min(player.x - 18, 220)
        : phase === 'dialogue'
          ? 290
          : Math.min(player.x - 14, DOOR_X - 20);
    const dx = targetX - motherX;
    if (Math.abs(dx) > 2) {
      motherX += Math.sign(dx) * Math.min(38, Math.abs(dx)) * dt * 2.2;
    }
    // Snap mother Y to nearest platform under her X
    let best = GROUND_Y;
    for (const p of PLATFORMS) {
      if (motherX >= p.x && motherX <= p.x + p.w) {
        if (p.y <= motherFloor + 40) best = p.y;
      }
    }
    // Prefer following player's floor when close in X
    if (Math.abs(motherX - player.x) < 80) {
      motherFloor = player.y;
      best = player.y;
    }
    motherY += (best - motherY) * Math.min(1, dt * 5);
    motherFloor = best;
  };

  const gangsterFloor = (_g: Gangster): number => {
    // Keep thugs on the floor they spawned for
    if (phase === 'wave2') return UPPER_Y;
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
    drawStairwellInterior(ctx, WORLD_W, viewH);
    drawEntranceDoor(ctx);
    drawMailboxes(ctx);
    drawStairsAndLandings(ctx);
    drawApartmentDoor(ctx);
    drawMother(ctx, motherX, motherY, motherFear);
    for (const g of gangsters) g.render(ctx, alpha);
    for (const b of bubbles) b.render(ctx);
    player.render(ctx, alpha);
    drawSmokeVibes(ctx, time);
  };

  const stack = new ParallaxStack();

  const rebuildStack = (alpha: number, _width: number, _height: number): void => {
    stack.setLayers([
      {
        id: 'night_exterior',
        speedRatio: 0.08,
        zIndex: 0,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => drawNightExterior(ctx, w, h, scroll),
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
              ambient: { color: 'rgba(28, 24, 36, 0.58)' },
              points: bulbs,
              cones: headlightCones(),
              time,
            },
            ART_SCALE,
          );
        },
      },
      {
        id: 'snow_entrance',
        speedRatio: 0.9,
        zIndex: 50,
        screenSpace: true,
        draw: (ctx, scroll, _c, w, h) => drawEntranceSnow(ctx, w, h, scroll),
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
      bubbles = [];
      phase = 'wave1';
      gameOverTimer = 0;
      toast = '';
      toastTimer = 0;
      time = 0;
      shake = 0;
      motherFear = 1;
      winTimer = 0;
      dialogueStarted = false;
      wave2Cleared = false;
      motherX = 55;
      motherY = GROUND_Y;
      motherFloor = GROUND_Y;
      carX = -40;
      carFacing = 1;
      dialogue.resetSilent();
      spawnWave1();
      syncHud('Зачисти вход - веди маму');
    },

    exit(): void {
      gangsters = [];
      bubbles = [];
      dialogue.resetSilent();
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

      // Dim headlights drift past the entrance
      carX += carFacing * 28 * dt;
      if (carFacing > 0 && carX > 120) {
        carFacing = -1;
        carX = 110;
      }
      if (carFacing < 0 && carX < -80) {
        carFacing = 1;
        carX = -70;
      }

      if (phase === 'dialogue' && dialogue.isOpen) {
        dialogue.update(dt);
        player.update(dt);
        updateMother(dt);
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
        motherFear = Math.min(1, motherFear + dt * 0.02);
        syncHud();
        const target = player.x - 120;
        camX += (target - camX) * Math.min(1, dt * 6);
        if (camX < 0) camX = 0;
        if (camX > WORLD_W - LOGICAL_WIDTH) camX = WORLD_W - LOGICAL_WIDTH;
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
        syncHud('УР. 2 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level2Cleared', true);
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.65 });
        }
        return;
      }

      player.update(dt);
      updateMother(dt);
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
        player.applyWalk(axis, dt, 16, WORLD_W - 16);
      }

      player.applyPhysics(dt, 16, WORLD_W - 16, PLATFORMS);

      const atk = player.attackHitbox();
      if (atk) {
        for (const g of gangsters) {
          if (g.isKo) continue;
          // Only hit thugs on similar floor
          if (Math.abs(g.y - player.y) > 28) continue;
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
        const fy = gangsterFloor(g);
        const minX = phase === 'wave2' ? 400 : 40;
        const maxX = phase === 'wave2' ? WORLD_W - 20 : 200;
        g.update(dt, player.x, player.y, fy, minX, maxX);
        if (player.invuln > 0 || player.isKo || g.isKo) continue;
        if (Math.abs(g.y - player.y) > 28) continue;
        const ah = g.attackHitbox();
        if (ah && aabbOverlap(ah, player.body())) {
          const dmg = g.consumeAttackHit();
          if (dmg > 0) {
            const scaled = motherFear > 0.8 ? dmg + 3 : dmg;
            player.takeDamage(scaled, g.facing);
          }
        }
      }

      if (player.isKo) {
        phase = 'gameover';
        gameOverTimer = 1.8;
        toast = 'СИЛА ДУХА СЛОМЛЕНА';
        toastTimer = 1.8;
      }

      const alive = gangsters.filter((g) => !g.isKo).length;

      if (phase === 'wave1' && !dialogueStarted) {
        const anyKo = gangsters.some((g) => g.isKo);
        if (alive === 0 || (nearMidLanding() && anyKo)) {
          if (nearMidLanding()) {
            beginLandingDialogue();
          } else {
            if (toastTimer <= 0) {
              toast = 'НАВЕРХ - ВЕДИ МАМУ';
              toastTimer = 1.2;
            }
            syncHud('Поднимись на площадку');
          }
        } else {
          syncHud(
            alive === 1
              ? 'Один гопник - потом вверх'
              : `Волна 1 · Гопники ${alive} · Вход`,
          );
        }
      } else if (phase === 'wave2') {
        if (alive === 0) {
          wave2Cleared = true;
          if (nearDoor()) {
            phase = 'cleared';
            winTimer = 2.4;
            toast = 'ДОМ - ДВЕРЬ ДОСТИГНУТА';
            toastTimer = 2.4;
            syncHud('УР. 2 ПРОЙДЕН');
          } else {
            syncHud('Доберись до двери');
            toast = toast || 'ДВЕРЬ ВПЕРЕДИ';
            if (toastTimer <= 0) {
              toast = 'ДВЕРЬ ВПЕРЕДИ';
              toastTimer = 1.0;
            }
          }
        } else {
          syncHud();
        }
      }

      const target = player.x - 120;
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

      // Level title lives in HUD top-right — no overlapping center panel

      if (phase === 'dialogue' && dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      } else {
        const hint =
          phase === 'wave2' && wave2Cleared
            ? 'К двери · Пробел — прыжок'
            : 'J удар · K нога · L базар · Пробел — прыжок';
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
        drawUiTextCentered(ctx, 'Назад в 2026…', width / 2, height / 2 + 2, P.uiBorder, 7, 500);
      }

      if (phase === 'cleared') {
        ctx.fillStyle = 'rgba(4, 12, 8, 0.45)';
        ctx.fillRect(0, 0, width, height);
        const gw = measureUiText(ctx, 'Ур. 2 пройден', 12, 700) + 24;
        uiPanel(
          ctx,
          Math.round((width - gw) / 2),
          Math.round(height / 2 - 24),
          gw,
          44,
          'rgba(8,20,14,0.92)',
          'rgba(64,200,120,0.8)',
        );
        drawUiTextCentered(ctx, 'Ур. 2 пройден', width / 2, height / 2 - 16, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Мама дома в безопасности', width / 2, height / 2 + 4, P.uiBorder, 7, 500);
      }
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    __debug: {
      getPhase: () => phase,
      forceDialogue: () => {
        player.x = 290;
        player.setFloorY(MID_LANDING_Y);
        player.y = MID_LANDING_Y;
        player.grounded = true;
        beginLandingDialogue();
      },
      forceWave2Calm: () => {
        dialogue.resetSilent();
        motherFear = 0.25;
        phase = 'wave2';
        wave2Cleared = false;
        spawnWave2();
        player.x = 410;
        player.setFloorY(UPPER_Y);
        player.y = UPPER_Y;
        player.grounded = true;
        motherX = 400;
        motherY = UPPER_Y;
        syncHud();
      },
      clearWave2: () => {
        for (const g of gangsters) g.takeHit(999, 1);
        wave2Cleared = true;
      },
      skipToChoices: () => {
        if (!dialogue.isOpen) {
          player.x = 290;
          player.setFloorY(MID_LANDING_Y);
          player.y = MID_LANDING_Y;
          beginLandingDialogue();
        }
        dialogue.advance();
        dialogue.advance();
        dialogue.advance();
        dialogue.advance();
      },
      forceClear: () => {
        phase = 'cleared';
        winTimer = 0.4;
        states.setFlag('level2Cleared', true);
      },
    },
  };
}

/* ───────────────────── Environment draws ───────────────────── */

function drawNightExterior(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
): void {
  px(ctx, 0, 0, width, height, P.night);
  ditherRect(ctx, 0, 0, width, 60, P.night, P.nightMid);
  // Distant brick blocks
  const ox = Math.round(scroll * 0.2);
  for (let i = -1; i < 4; i++) {
    const bx = i * 100 - (ox % 100);
    px(ctx, bx, 40, 70, 90, '#2a2030');
    px(ctx, bx + 8, 48, 10, 12, '#3a3040');
    px(ctx, bx + 28, 56, 10, 12, '#403848');
    px(ctx, bx + 48, 50, 10, 12, '#383040');
  }
  // Snow ground strip outside
  px(ctx, 0, GROUND_Y - 8, width, height - (GROUND_Y - 8), P.snowMid);
}

function drawStairwellInterior(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  height: number,
): void {
  // Inner wall mass (covers exterior behind platforms)
  px(ctx, 0, 0, worldW, height, P.wallDark);
  fillBricks(ctx, 0, 0, worldW, height, P.brickDark, P.mortar, P.brick, 11, 6, P.brickHi);
  // Peeling plaster patches
  for (const patch of [
    [40, 40, 50, 36],
    [180, 20, 40, 28],
    [300, 8, 55, 40],
    [420, 0, 60, 30],
  ] as const) {
    px(ctx, patch[0], patch[1], patch[2], patch[3], P.plaster);
    ditherRect(ctx, patch[0], patch[1], patch[2], patch[3], P.plaster, P.wallPeel);
    px(ctx, patch[0], patch[1] + patch[3] - 2, patch[2], 2, P.plasterDark);
  }
  // Vertical shaft shadow
  ditherRect(ctx, 210, 0, 40, height, P.wallDark, '#2a2420');
}

function drawEntranceDoor(ctx: CanvasRenderingContext2D): void {
  // Open street doorway on the left — snow + night visible
  px(ctx, 8, GROUND_Y - 78, 36, 78, P.nightMid);
  ditherRect(ctx, 10, GROUND_Y - 76, 32, 40, P.night, P.nightMid);
  px(ctx, 10, GROUND_Y - 8, 32, 8, P.snow);
  // Door frame
  px(ctx, 6, GROUND_Y - 80, 4, 80, P.doorDark);
  px(ctx, 42, GROUND_Y - 80, 4, 80, P.doorDark);
  px(ctx, 6, GROUND_Y - 82, 40, 4, P.door);
  // Half-open metal door
  px(ctx, 40, GROUND_Y - 76, 14, 76, P.door);
  px(ctx, 42, GROUND_Y - 74, 2, 72, P.doorHi);
  px(ctx, 48, GROUND_Y - 50, 3, 8, P.doorNum);
  // Number plate
  segaBox(ctx, 18, GROUND_Y - 92, 28, 12, P.doorDark, P.doorNum, { inset: false });
  drawUiText(ctx, '№7', 24, GROUND_Y - 89, P.doorNum, 7, 700);
}

function drawMailboxes(ctx: CanvasRenderingContext2D): void {
  const bx = 55;
  const by = GROUND_Y - 52;
  px(ctx, bx, by, 48, 36, P.mailboxDark);
  px(ctx, bx + 1, by + 1, 46, 1, P.mailboxHi);
  px(ctx, bx + 1, by + 2, 1, 32, P.mailboxHi);
  px(ctx, bx + 46, by + 2, 1, 32, '#1a2428');
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = bx + 3 + col * 15;
      const y = by + 3 + row * 11;
      px(ctx, x, y, 13, 9, P.mailbox);
      px(ctx, x + 1, y + 1, 11, 1, P.mailboxHi);
      px(ctx, x + 1, y + 2, 11, 1, 'rgba(255,255,255,0.08)');
      px(ctx, x + 1, y + 7, 11, 1, '#2a3840');
      px(ctx, x + 9, y + 4, 2, 3, P.doorNum);
      px(ctx, x + 9, y + 4, 1, 1, '#e0c070');
      px(ctx, x + 2, y + 5, 5, 1, P.mailboxDark);
      speckles(ctx, x, y, 13, 9, '#3a4850', 4, row * 3 + col);
    }
  }
}

function drawStairsAndLandings(ctx: CanvasRenderingContext2D): void {
  for (const p of PLATFORMS) {
    // Landing slab with midtone bevel
    px(ctx, p.x, p.y - 4, p.w, 6, P.stair);
    px(ctx, p.x, p.y - 4, p.w, 1, P.stairHi);
    px(ctx, p.x, p.y - 3, p.w, 1, 'rgba(255,255,255,0.08)');
    px(ctx, p.x, p.y + 1, p.w, 3, P.stairDark);
    px(ctx, p.x, p.y, p.w, 2, P.floorHi);
    // Fine edge wear
    for (let sx = p.x + 4; sx < p.x + p.w - 4; sx += 8) {
      px(ctx, sx, p.y - 2, 2, 1, P.stairDark);
    }
  }
  px(ctx, 170, 70, 2, 130, P.railDark);
  px(ctx, 168, 68, 6, 3, P.rail);
  for (let y = 80; y < 200; y += 14) {
    px(ctx, 170, y, 18, 2, P.rail);
    px(ctx, 171, y, 16, 1, P.railHi);
    px(ctx, 186, y, 2, 8, P.railHi);
  }
  px(ctx, 240, MID_LANDING_Y - 28, 2, 28, P.rail);
  px(ctx, 240, MID_LANDING_Y - 28, 130, 2, P.railHi);
  px(ctx, 400, UPPER_Y - 24, 2, 24, P.rail);
  px(ctx, 400, UPPER_Y - 24, 100, 2, P.railHi);

  for (const [bx, by] of [
    [70, 100],
    [280, 55],
    [440, 18],
  ] as const) {
    px(ctx, bx, by - 14, 1, 14, P.railDark);
    px(ctx, bx - 4, by - 1, 9, 7, P.bulbDim);
    px(ctx, bx - 3, by, 7, 5, P.bulb);
    px(ctx, bx - 2, by + 1, 5, 2, '#fff0c0');
  }
}

function drawApartmentDoor(ctx: CanvasRenderingContext2D): void {
  const x = DOOR_X;
  const y = UPPER_Y;
  px(ctx, x, y - 42, DOOR_W, 42, P.door);
  px(ctx, x + 2, y - 40, DOOR_W - 4, 2, P.doorHi);
  px(ctx, x + 2, y - 40, 2, 38, P.doorHi);
  px(ctx, x + DOOR_W - 8, y - 24, 3, 6, P.doorNum);
  segaBox(ctx, x + 4, y - 48, 20, 8, P.doorDark, P.doorNum, { inset: false });
  drawUiText(ctx, '42', x + 8, y - 46, P.doorNum, 6.5, 700);
  // Peephole
  px(ctx, x + 12, y - 28, 3, 3, '#1a1810');
}

function drawMother(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  fear: number,
): void {
  const ox = Math.round(x);
  const oy = Math.round(floorY);
  // Winter coat with fur collar + folds
  px(ctx, ox - 7, oy - 32, 14, 20, '#6a4838');
  px(ctx, ox - 6, oy - 30, 5, 6, '#8a6850');
  px(ctx, ox + 1, oy - 28, 4, 8, '#5a3828');
  speckles(ctx, ox - 7, oy - 32, 14, 20, '#4a3020', 3, 2);
  px(ctx, ox - 6, oy - 32, 12, 3, '#c8a070'); // fur collar
  px(ctx, ox - 5, oy - 31, 10, 1, '#e0c090');
  speckles(ctx, ox - 6, oy - 32, 12, 3, '#a08060', 2, 1);
  // Head + headscarf
  px(ctx, ox - 5, oy - 40, 10, 9, '#d0a878');
  px(ctx, ox - 4, oy - 39, 3, 2, '#e8c898');
  px(ctx, ox + 2, oy - 37, 2, 3, '#a87858');
  px(ctx, ox - 5, oy - 43, 10, 4, '#4a3040');
  px(ctx, ox - 4, oy - 44, 8, 2, '#6a4858');
  px(ctx, ox - 6, oy - 41, 2, 6, '#4a3040'); // scarf side
  px(ctx, ox + 4, oy - 41, 2, 6, '#3a2830');
  // Face
  px(ctx, ox - 3, oy - 36, 2, 2, '#181018');
  px(ctx, ox + 1, oy - 36, 2, 2, '#181018');
  px(ctx, ox - 2, oy - 36, 1, 1, '#e8e0d0');
  px(ctx, ox + 2, oy - 36, 1, 1, '#e8e0d0');
  px(ctx, ox - 1, oy - 34, 2, 1, '#a87858');
  px(ctx, ox - 2, oy - 32, 4, 1, fear > 0.55 ? '#603030' : '#806050');
  if (fear > 0.55) {
    px(ctx, ox + 6, oy - 40, 1, 2, '#80c0e0');
    drawUiText(ctx, '!', ox + 8, oy - 44, '#e04040', 8, 700);
  }
  // Arms / hands
  px(ctx, ox - 10, oy - 28, 3, 7, '#d0a878');
  px(ctx, ox + 7, oy - 28, 3, 7, '#d0a878');
  px(ctx, ox - 9, oy - 27, 1, 3, '#e8c898');
  // Skirt / legs + boots
  px(ctx, ox - 5, oy - 12, 4, 8, '#3a3048');
  px(ctx, ox + 1, oy - 12, 4, 8, '#3a3048');
  px(ctx, ox - 6, oy - 4, 5, 4, '#18141c');
  px(ctx, ox + 1, oy - 4, 5, 4, '#18141c');
}

function drawSmokeVibes(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = P.smoke;
  for (let i = 0; i < 8; i++) {
    const sx = 90 + Math.sin(t * 0.7 + i) * 6 + i * 3;
    const sy = GROUND_Y - 40 - ((t * 12 + i * 9) % 36);
    if (sy > 40) ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  }
}

function drawEntranceSnow(
  ctx: CanvasRenderingContext2D,
  _width: number,
  height: number,
  scroll: number,
): void {
  const t = performance.now() / 1000;
  // Only near left (entrance) — light outdoor flakes
  for (let i = 0; i < 18; i++) {
    const sx = (i * 17 + Math.sin(t + i) * 8 + scroll * 0.2) % 90;
    const sy = (i * 23 + t * (14 + (i % 5) * 5)) % height;
    ctx.fillStyle = i % 3 === 0 ? P.snow : P.snowMid;
    ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  }
}
