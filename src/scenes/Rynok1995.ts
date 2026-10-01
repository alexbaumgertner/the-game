/**
 * ERA_1995 — Novgorod Rynok combat strip (Neo-Noir 16-bit).
 * Parallax: Kremlin → Khrushchyovkas → gameplay → lighting → weather.
 * Teen arcade brawler: move / jump / punch / kick / Bazar stun.
 * Mental Fortitude → 0 triggers Game Over → snap back to 2026 apartment.
 */

import type { StateManager } from '@/core/StateManager';
import { BAZAR_COST, MAX_FORTITUDE, MAX_SWAGGER, type Player } from '@/entities/Player';
import { Gangster } from '@/entities/Gangster';
import { BazarBubble } from '@/entities/BazarBubble';
import type { HUD } from '@/ui/HUD';
import { RYNOK_PAL } from '@/art/segaPalette';
import { ditherRect, fillBricks, fillSkyGradient, px, segaBox } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';
import { aabbOverlap } from '@/systems/CombatMath';
import { ParallaxStack } from '@/render/ParallaxLayer';
import {
  applyLightingOverlay,
  makeHeadlight,
  makeTrashFire,
  type ConeLight,
  type PointLight,
} from '@/render/LightingOverlay';

const FLOOR_Y = 188;
const R = RYNOK_PAL;
const WORLD_W = 560;

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
}

export function createRynok1995Scene(deps: RynokSceneDeps) {
  const { states, player, hud } = deps;

  let camX = 0;
  let gangsters: Gangster[] = [];
  let bubbles: BazarBubble[] = [];
  let gameOver = false;
  let gameOverTimer = 0;
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let shake = 0;
  let cars: StreetCar[] = [];

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

  const spawnWave = (): void => {
    gangsters = [
      new Gangster({ x: 220, y: FLOOR_Y, hp: 36 }),
      new Gangster({ x: 340, y: FLOOR_Y, hp: 32 }),
      new Gangster({ x: 420, y: FLOOR_Y, hp: 40 }),
    ];
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
      eraLabel: 'TEEN · 1995',
      objective: objective ?? 'Clear the rynok thugs',
    });
  };

  const clearCombatAndReturn = (): void => {
    gangsters = [];
    bubbles = [];
    gameOver = false;
    gameOverTimer = 0;
    player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
    states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.55 });
  };

  const headlightCones = (): ConeLight[] =>
    cars.map((c) =>
      makeHeadlight(
        c.x + (c.facing > 0 ? 22 : -22),
        c.y + 6,
        c.facing,
        120,
        20,
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
    drawBrickWall(ctx, WORLD_W);
    drawGround(ctx, WORLD_W, viewH);
    drawTrashCan(ctx, 62, FLOOR_Y);
    drawTrashCan(ctx, 242, FLOOR_Y);
    drawTrashCan(ctx, 392, FLOOR_Y);
    drawTrashCan(ctx, 502, FLOOR_Y);
    drawStall(ctx, 100, FLOOR_Y, 'FISH', 'red');
    drawStall(ctx, 210, FLOOR_Y, 'BREAD', 'blue');
    drawStall(ctx, 330, FLOOR_Y, 'FURS', 'brown');
    drawGate(ctx);
    for (const c of cars) drawCar(ctx, c);
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
        id: 'khrushchyovka',
        speedRatio: 0.42,
        zIndex: 20,
        screenSpace: true,
        draw: (ctx, scroll) => drawKhrushchyovkas(ctx, width, scroll),
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
            ambient: { color: 'rgba(18, 22, 48, 0.72)' },
            points: fireSpots,
            cones: headlightCones(),
            time,
          });
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
      player.setEra('teen');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = 60;
      player.setFloorY(FLOOR_Y);
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 60;
      camX = 0;
      bubbles = [];
      gameOver = false;
      gameOverTimer = 0;
      toast = '';
      toastTimer = 0;
      time = 0;
      shake = 0;
      spawnWave();
      spawnCars();
      syncHud('Punch thugs - fill Swagger');
    },

    exit(): void {
      gangsters = [];
      bubbles = [];
      cars = [];
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

      // Moving cars along the strip (behind combat Y-ish but drawn in gameplay)
      for (const c of cars) {
        c.x += c.facing * c.speed * dt;
        if (c.facing > 0 && c.x > WORLD_W + 80) c.x = -60;
        if (c.facing < 0 && c.x < -80) c.x = WORLD_W + 60;
      }

      if (gameOver) {
        gameOverTimer -= dt;
        player.update(dt);
        if (gameOverTimer <= 0) {
          clearCombatAndReturn();
        }
        syncHud('GAME OVER');
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
            toast = `NEED ${BAZAR_COST} SWAG`;
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
        if (player.invuln > 0 || player.isKo || g.isKo) continue;
        const ah = g.attackHitbox();
        if (ah && aabbOverlap(ah, player.body())) {
          const dmg = g.consumeAttackHit();
          if (dmg > 0) player.takeDamage(dmg, g.facing);
        }
      }

      if (player.isKo && !gameOver) {
        gameOver = true;
        gameOverTimer = 1.8;
        toast = 'MENTAL FORTITUDE BROKEN';
        toastTimer = 1.8;
      }

      const alive = gangsters.filter((g) => !g.isKo).length;
      if (alive === 0 && !gameOver) {
        syncHud('Wave clear - walk on');
      } else {
        syncHud(alive === 1 ? 'One thug left' : `Thugs: ${alive}`);
      }

      const target = player.x - 140;
      camX += (target - camX) * Math.min(1, dt * 6);
      if (camX < 0) camX = 0;
      if (camX > WORLD_W - 320) camX = WORLD_W - 320;
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

      const title = 'NOVGOROD RYNOK - WINTER 1995';
      const tw = measureNesText(title, 1, 1) + 16;
      segaBox(ctx, Math.round((width - tw) / 2), 6, tw, 16, R.uiBox, R.uiBorder, {
        borderDark: R.uiBorderDark,
        fillHi: R.uiBoxHi,
      });
      drawNesTextCentered(ctx, title, width / 2, 11, R.uiText, 1, 1);

      const hint = 'J PUNCH  K KICK  L BAZAR  SPACE JUMP';
      const hw = measureNesText(hint, 1, 1) + 10;
      segaBox(ctx, 4, height - 16, Math.min(hw, width - 8), 12, R.uiBox, R.uiBorderDark, {
        inset: false,
      });
      drawNesText(ctx, hint, 8, height - 12, R.uiBorder, 1, 1);

      if (toast) {
        const tw2 = measureNesText(toast, 1, 1) + 14;
        segaBox(
          ctx,
          Math.round((width - tw2) / 2),
          28,
          tw2,
          14,
          '#201018',
          '#f0c040',
          { borderDark: '#a05020', inset: false },
        );
        drawNesTextCentered(ctx, toast, width / 2, 32, '#f8f0d0', 1, 1);
      }

      if (gameOver) {
        ctx.fillStyle = 'rgba(8, 4, 8, 0.55)';
        ctx.fillRect(0, 0, width, height);
        const gw = measureNesText('GAME OVER', 2, 1) + 24;
        segaBox(
          ctx,
          Math.round((width - gw) / 2),
          Math.round(height / 2 - 28),
          gw,
          40,
          R.uiBox,
          '#e04040',
          { borderDark: '#802020', fillHi: '#281018' },
        );
        drawNesTextCentered(ctx, 'GAME OVER', width / 2, height / 2 - 16, '#f08080', 2, 1);
        drawNesTextCentered(ctx, 'BACK TO 2026...', width / 2, height / 2 + 2, R.uiBorder, 1, 1);
      }
    },
  };
}

/* ───────────────────── Environment draws ───────────────────── */

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Darker Neo-Noir winter sky
  fillSkyGradient(
    ctx,
    width,
    [
      { y: 0, h: 40, color: '#080c18' },
      { y: 40, h: 28, color: '#101828' },
      { y: 68, h: 28, color: '#182438' },
      { y: 96, h: 36, color: '#243048' },
      { y: 132, h: height - 132, color: '#304058' },
    ],
    [
      { y: 39, a: '#080c18', b: '#101828' },
      { y: 67, a: '#101828', b: '#182438' },
      { y: 95, a: '#182438', b: '#243048' },
      { y: 131, a: '#243048', b: '#304058' },
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
    // Wall mass
    px(ctx, bx, baseY + 18, 100, 28, '#0c101c');
    // Towers
    px(ctx, bx + 8, baseY, 16, 46, '#0a0e18');
    px(ctx, bx + 10, baseY - 8, 12, 10, '#121828');
    // Spire
    px(ctx, bx + 14, baseY - 18, 4, 12, '#181e2c');
    px(ctx, bx + 15, baseY - 22, 2, 6, '#202838');
    px(ctx, bx + 48, baseY + 4, 22, 42, '#0a0e18');
    px(ctx, bx + 52, baseY - 6, 14, 12, '#121828');
    px(ctx, bx + 56, baseY - 14, 6, 10, '#181e2c');
    // Dome hint
    px(ctx, bx + 78, baseY + 6, 18, 40, '#0c101c');
    px(ctx, bx + 82, baseY - 2, 10, 10, '#1a2030');
    // Tiny lit windows
    if ((i + 3) % 2 === 0) {
      px(ctx, bx + 14, baseY + 20, 2, 2, '#c8a040');
      px(ctx, bx + 56, baseY + 24, 2, 2, '#a88830');
    }
  }
  // Horizon mist band
  ditherRect(ctx, 0, baseY + 40, width, 4, '#182030', '#243048');
}

/** Midground panel-block Khrushchyovka row. */
function drawKhrushchyovkas(
  ctx: CanvasRenderingContext2D,
  width: number,
  scroll: number,
): void {
  for (let i = -1; i < 8; i++) {
    const bx = Math.round(i * 78 - (scroll % 78));
    const h = 52 + (i % 3) * 8;
    const top = 100 - (h - 52);
    px(ctx, bx, top, 70, h, '#2a3048');
    px(ctx, bx + 2, top + 2, 66, 2, '#3a4860');
    px(ctx, bx, top, 2, h, '#1a2030');
    px(ctx, bx + 68, top, 2, h, '#1a2030');
    // Snow roof
    px(ctx, bx - 2, top - 3, 74, 4, '#c8d0dc');
    px(ctx, bx + 4, top - 5, 20, 2, '#e0e8f0');
    // Window grid
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const lit = (i + row + col) % 5 === 0;
        px(
          ctx,
          bx + 10 + col * 18,
          top + 10 + row * 10,
          10,
          7,
          lit ? '#d8b050' : '#141820',
        );
        if (lit) px(ctx, bx + 10 + col * 18, top + 10 + row * 10, 10, 2, '#f0d878');
      }
    }
    // Balcony rail
    if (i % 2 === 0) {
      px(ctx, bx + 40, top + 28, 22, 2, '#485068');
      px(ctx, bx + 40, top + 28, 2, 8, '#485068');
      px(ctx, bx + 60, top + 28, 2, 8, '#485068');
    }
  }
  // Soft ground fog under buildings
  ditherRect(ctx, 0, 148, width, 6, '#283040', '#304058');
}

function drawBrickWall(ctx: CanvasRenderingContext2D, worldW: number): void {
  fillBricks(
    ctx,
    0,
    154,
    worldW,
    FLOOR_Y - 158,
    R.brick,
    R.mortar,
    R.brickHi,
    16,
    8,
    R.brickDark,
  );
  for (let x = 20; x < worldW; x += 48) {
    px(ctx, x, 160, 14, 6, R.brickMid);
    px(ctx, x + 24, 168, 14, 6, R.brickDeep);
  }
  px(ctx, 0, FLOOR_Y - 14, worldW, 10, R.concrete);
  px(ctx, 0, FLOOR_Y - 14, worldW, 2, R.concreteHi);
  px(ctx, 0, FLOOR_Y - 6, worldW, 2, R.concreteDark);
  for (let x = 0; x < worldW; x += 18) {
    px(ctx, x, FLOOR_Y - 12, 1, 6, R.concreteDark);
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

function drawStall(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  label: string,
  theme: 'red' | 'blue' | 'brown',
): void {
  const awning =
    theme === 'red' ? R.awningRed : theme === 'blue' ? R.awningBlue : R.awningBrown;
  const awningHi =
    theme === 'red' ? R.awningRedHi : theme === 'blue' ? R.awningBlueHi : R.awningBrownHi;
  const awningDark =
    theme === 'red' ? R.awningDark : theme === 'blue' ? R.awningBlueDark : R.awningBrownDark;

  px(ctx, x, floorY - 56, 68, 12, awning);
  px(ctx, x, floorY - 56, 68, 2, R.awningStripe);
  px(ctx, x, floorY - 54, 68, 1, awningHi);
  for (let i = 0; i < 6; i++) {
    px(ctx, x + 4 + i * 11, floorY - 52, 7, 7, i % 2 === 0 ? awning : awningDark);
  }
  px(ctx, x + 8, floorY - 58, 12, 2, R.snow);
  px(ctx, x + 40, floorY - 58, 10, 2, R.snow);

  px(ctx, x + 4, floorY - 44, 4, 44, R.wood);
  px(ctx, x + 5, floorY - 44, 1, 44, R.woodHi);
  px(ctx, x + 60, floorY - 44, 4, 44, R.wood);
  px(ctx, x + 61, floorY - 44, 1, 44, R.woodHi);

  px(ctx, x + 2, floorY - 24, 64, 14, R.wood);
  px(ctx, x + 2, floorY - 24, 64, 2, R.woodHi);
  px(ctx, x + 2, floorY - 12, 64, 2, R.woodDark);
  px(ctx, x + 2, floorY - 10, 64, 2, R.woodDeep);

  if (label === 'FISH') {
    px(ctx, x + 8, floorY - 32, 12, 6, R.fish);
    px(ctx, x + 10, floorY - 33, 8, 2, R.fishHi);
    px(ctx, x + 24, floorY - 30, 14, 5, R.fish);
    px(ctx, x + 42, floorY - 32, 10, 6, R.fishDark);
  } else if (label === 'BREAD') {
    px(ctx, x + 10, floorY - 32, 10, 6, R.bread);
    px(ctx, x + 22, floorY - 34, 12, 8, R.breadHi);
    px(ctx, x + 36, floorY - 30, 10, 5, R.bread);
    px(ctx, x + 48, floorY - 33, 8, 7, R.breadDark);
  } else {
    px(ctx, x + 8, floorY - 34, 16, 10, R.fur);
    px(ctx, x + 28, floorY - 32, 14, 8, R.furDark);
    px(ctx, x + 44, floorY - 34, 12, 10, R.fur);
  }

  segaBox(ctx, x + 14, floorY - 68, 40, 12, R.uiBox, R.awningStripe, {
    borderDark: R.woodDeep,
    inset: false,
  });
  drawNesTextCentered(ctx, label, x + 34, floorY - 64, R.uiText, 1, 1);
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
  for (let i = 0; i < 48; i++) {
    const sx = (i * 47 + Math.sin(t * 0.7 + i) * 12 + scroll * 0.35) % width;
    const sy = (i * 29 + t * (18 + (i % 7) * 7)) % height;
    const big = i % 4 === 0;
    ctx.fillStyle = big ? R.snowHi : i % 3 === 0 ? R.snow : R.snowMid;
    ctx.fillRect(Math.round(sx), Math.round(sy), big ? 2 : 1, big ? 2 : 1);
  }
}
