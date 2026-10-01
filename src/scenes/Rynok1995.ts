/**
 * ERA_1995 — Novgorod Rynok, Winter 1995.
 * Genesis tiled brick/snow market strip with parallax roofs; teen walk/run.
 */

import type { StateManager } from '@/core/StateManager';
import type { Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import { RYNOK_PAL } from '@/art/segaPalette';
import { ditherRect, fillBricks, fillSkyGradient, px, segaBox } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';

const FLOOR_Y = 188;
const R = RYNOK_PAL;

export interface RynokSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
}

export function createRynok1995Scene(deps: RynokSceneDeps) {
  const { states, player, hud } = deps;

  let camX = 0;
  const worldW = 480;

  return {
    enter(): void {
      player.setEra('teen');
      player.x = 60;
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 60;
      camX = 0;
      hud.set({
        hp: player.hp,
        maxHp: 100,
        eraLabel: 'TEEN · 1995',
        fortitude: 100,
        objective: 'Walk the strip',
      });
    },

    exit(): void {
      // nothing
    },

    update(dt: number): void {
      player.update(dt);
      const axis = states.input?.axisX() ?? 0;
      player.applyWalk(axis, dt, 20, worldW - 20);

      const target = player.x - 160;
      camX += (target - camX) * Math.min(1, dt * 6);
      if (camX < 0) camX = 0;
      if (camX > worldW - 320) camX = worldW - 320;
    },

    render(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      _ctx: unknown,
      width: number,
      height: number,
    ): void {
      const ox = Math.round(camX);

      drawSky(ctx, width, height);
      drawDistantRoofs(ctx, width, ox * 0.22);
      drawMidRoofs(ctx, width, ox * 0.45);

      ctx.save();
      ctx.translate(-ox, 0);

      drawBrickWall(ctx, worldW);
      drawGround(ctx, worldW, height);
      drawStall(ctx, 90, FLOOR_Y, 'FISH', 'red');
      drawStall(ctx, 195, FLOOR_Y, 'BREAD', 'blue');
      drawStall(ctx, 310, FLOOR_Y, 'FURS', 'brown');
      drawGate(ctx);

      player.render(ctx, alpha);
      ctx.restore();

      const title = 'NOVGOROD RYNOK - WINTER 1995';
      const tw = measureNesText(title, 1, 1) + 16;
      segaBox(ctx, Math.round((width - tw) / 2), 6, tw, 16, R.uiBox, R.uiBorder, {
        borderDark: R.uiBorderDark,
        fillHi: R.uiBoxHi,
      });
      drawNesTextCentered(ctx, title, width / 2, 11, R.uiText, 1, 1);

      drawSnowParticles(ctx, width, height, ox);

      const hint = 'A D / ARROWS WALK';
      segaBox(ctx, 4, height - 16, measureNesText(hint, 1, 1) + 10, 12, R.uiBox, R.uiBorderDark, {
        inset: false,
      });
      drawNesText(ctx, hint, 8, height - 12, R.uiBorder, 1, 1);
    },
  };
}

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  fillSkyGradient(
    ctx,
    width,
    [
      { y: 0, h: 36, color: R.skyTop },
      { y: 36, h: 28, color: R.skyHi },
      { y: 64, h: 28, color: R.skyMid },
      { y: 92, h: 40, color: R.skyLow },
      { y: 132, h: height - 132, color: R.skyHorizon },
    ],
    [
      { y: 35, a: R.skyTop, b: R.skyHi },
      { y: 63, a: R.skyHi, b: R.skyMid },
      { y: 91, a: R.skyMid, b: R.skyLow },
      { y: 131, a: R.skyLow, b: R.skyHorizon },
    ],
  );
}

function drawDistantRoofs(ctx: CanvasRenderingContext2D, width: number, scroll: number): void {
  for (let i = 0; i < 12; i++) {
    const rx = Math.round(((i * 52 - scroll) % (width + 52)) - 26);
    px(ctx, rx, 70, 40, 18, R.roof);
    px(ctx, rx + 8, 62, 24, 10, R.roofMid);
    px(ctx, rx + 6, 62, 28, 2, R.roofSnow);
    px(ctx, rx + 12, 60, 16, 2, R.roofSnow);
    px(ctx, rx + 12, 76, 2, 2, R.skyTop);
    px(ctx, rx + 22, 76, 2, 2, '#e8c56a');
  }
}

function drawMidRoofs(ctx: CanvasRenderingContext2D, width: number, scroll: number): void {
  for (let i = 0; i < 8; i++) {
    const rx = Math.round(((i * 70 - scroll) % (width + 70)) - 35);
    px(ctx, rx, 82, 48, 22, R.roofMid);
    px(ctx, rx + 4, 82, 40, 2, R.roofSnow);
    px(ctx, rx + 10, 78, 28, 4, R.roof);
    px(ctx, rx + 12, 76, 24, 2, R.roofSnow);
    // Chimney
    if (i % 2 === 0) {
      px(ctx, rx + 34, 72, 6, 10, R.brickDark);
      px(ctx, rx + 33, 70, 8, 2, R.roofSnow);
    }
  }
}

function drawBrickWall(ctx: CanvasRenderingContext2D, worldW: number): void {
  fillBricks(
    ctx,
    0,
    104,
    worldW,
    FLOOR_Y - 108,
    R.brick,
    R.mortar,
    R.brickHi,
    16,
    8,
    R.brickDark,
  );
  // Occasional darker / lighter bricks for variety
  for (let x = 20; x < worldW; x += 48) {
    px(ctx, x, 120, 14, 6, R.brickMid);
    px(ctx, x + 24, 144, 14, 6, R.brickDeep);
  }
  // Concrete band
  px(ctx, 0, FLOOR_Y - 14, worldW, 10, R.concrete);
  px(ctx, 0, FLOOR_Y - 14, worldW, 2, R.concreteHi);
  px(ctx, 0, FLOOR_Y - 6, worldW, 2, R.concreteDark);
  for (let x = 0; x < worldW; x += 18) {
    px(ctx, x, FLOOR_Y - 12, 1, 6, R.concreteDark);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, worldW: number, height: number): void {
  // Packed street under snow
  px(ctx, 0, FLOOR_Y - 4, worldW, height - (FLOOR_Y - 4), R.street);
  ditherRect(ctx, 0, FLOOR_Y - 4, worldW, 4, R.streetHi, R.street);

  // Snow tile depth
  for (let x = 0; x < worldW; x += 10) {
    for (let y = FLOOR_Y + 2; y < height; y += 7) {
      const light = (x / 10 + y / 7) % 2 === 0;
      px(ctx, x, y, 10, 7, light ? R.snow : R.snowMid);
    }
  }
  // Top packed snow path
  px(ctx, 0, FLOOR_Y - 4, worldW, 4, R.snow);
  px(ctx, 0, FLOOR_Y - 4, worldW, 1, R.snowHi);
  px(ctx, 0, FLOOR_Y, worldW, 2, R.snowShadow);

  // Footprints / grit
  ctx.fillStyle = R.snowDeep;
  for (let x = 10; x < worldW; x += 20) {
    ctx.fillRect(x, FLOOR_Y + 10, 4, 1);
    ctx.fillRect(x + 6, FLOOR_Y + 16, 3, 1);
    ctx.fillRect(x + 2, FLOOR_Y + 22, 2, 1);
  }
  // Slush patches
  for (let x = 40; x < worldW; x += 70) {
    px(ctx, x, FLOOR_Y + 6, 18, 3, R.snowShadow);
    px(ctx, x + 2, FLOOR_Y + 7, 14, 1, R.streetDark);
  }
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

  // Awning with stripes + bevel
  px(ctx, x, floorY - 56, 68, 12, awning);
  px(ctx, x, floorY - 56, 68, 2, R.awningStripe);
  px(ctx, x, floorY - 54, 68, 1, awningHi);
  for (let i = 0; i < 6; i++) {
    px(ctx, x + 4 + i * 11, floorY - 52, 7, 7, i % 2 === 0 ? awning : awningDark);
  }
  // Snow on awning
  px(ctx, x + 8, floorY - 58, 12, 2, R.snow);
  px(ctx, x + 40, floorY - 58, 10, 2, R.snow);

  // Posts with wood grain
  px(ctx, x + 4, floorY - 44, 4, 44, R.wood);
  px(ctx, x + 5, floorY - 44, 1, 44, R.woodHi);
  px(ctx, x + 60, floorY - 44, 4, 44, R.wood);
  px(ctx, x + 61, floorY - 44, 1, 44, R.woodHi);

  // Counter bevelled
  px(ctx, x + 2, floorY - 24, 64, 14, R.wood);
  px(ctx, x + 2, floorY - 24, 64, 2, R.woodHi);
  px(ctx, x + 2, floorY - 12, 64, 2, R.woodDark);
  px(ctx, x + 2, floorY - 10, 64, 2, R.woodDeep);

  // Goods
  if (label === 'FISH') {
    px(ctx, x + 8, floorY - 32, 12, 6, R.fish);
    px(ctx, x + 10, floorY - 33, 8, 2, R.fishHi);
    px(ctx, x + 12, floorY - 30, 4, 1, R.fishDark);
    px(ctx, x + 24, floorY - 30, 14, 5, R.fish);
    px(ctx, x + 26, floorY - 31, 10, 2, R.fishHi);
    px(ctx, x + 42, floorY - 32, 10, 6, R.fishDark);
    px(ctx, x + 44, floorY - 33, 6, 2, R.fish);
    px(ctx, x + 8, floorY - 26, 46, 2, R.snow);
    px(ctx, x + 10, floorY - 25, 42, 1, R.snowHi);
  } else if (label === 'BREAD') {
    px(ctx, x + 10, floorY - 32, 10, 6, R.bread);
    px(ctx, x + 12, floorY - 33, 6, 2, R.breadHi);
    px(ctx, x + 22, floorY - 34, 12, 8, R.breadHi);
    px(ctx, x + 24, floorY - 36, 8, 2, R.bread);
    px(ctx, x + 36, floorY - 30, 10, 5, R.bread);
    px(ctx, x + 48, floorY - 33, 8, 7, R.breadDark);
    px(ctx, x + 50, floorY - 34, 4, 2, R.bread);
    // Basket rim
    px(ctx, x + 8, floorY - 26, 52, 2, R.woodDark);
  } else {
    px(ctx, x + 8, floorY - 34, 16, 10, R.fur);
    px(ctx, x + 10, floorY - 36, 12, 3, R.furHi);
    px(ctx, x + 12, floorY - 30, 8, 2, R.furDark);
    px(ctx, x + 28, floorY - 32, 14, 8, R.furDark);
    px(ctx, x + 30, floorY - 34, 10, 3, R.fur);
    px(ctx, x + 44, floorY - 34, 12, 10, R.fur);
    px(ctx, x + 46, floorY - 32, 8, 4, R.furHi);
    px(ctx, x + 48, floorY - 28, 6, 2, R.furDark);
  }

  // Sign
  segaBox(ctx, x + 14, floorY - 68, 40, 12, R.uiBox, R.awningStripe, {
    borderDark: R.woodDeep,
    inset: false,
  });
  drawNesTextCentered(ctx, label, x + 34, floorY - 64, R.uiText, 1, 1);
}

function drawGate(ctx: CanvasRenderingContext2D): void {
  px(ctx, 434, FLOOR_Y - 68, 12, 68, R.gate);
  px(ctx, 436, FLOOR_Y - 66, 2, 64, R.gateHi);
  px(ctx, 458, FLOOR_Y - 68, 12, 68, R.gate);
  px(ctx, 460, FLOOR_Y - 66, 2, 64, R.gateHi);
  px(ctx, 434, FLOOR_Y - 74, 36, 10, R.wood);
  px(ctx, 436, FLOOR_Y - 72, 32, 2, R.woodHi);
  px(ctx, 444, FLOOR_Y - 48, 16, 4, R.woodDark);
  px(ctx, 444, FLOOR_Y - 34, 16, 4, R.woodDark);
  px(ctx, 432, FLOOR_Y - 76, 40, 3, R.snow);
  px(ctx, 436, FLOOR_Y - 78, 12, 2, R.snowHi);
  px(ctx, 454, FLOOR_Y - 78, 10, 2, R.snow);
}

function drawSnowParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ox: number,
): void {
  const t = performance.now() / 1000;
  for (let i = 0; i < 36; i++) {
    const sx = (i * 47 + Math.sin(t * 0.7 + i) * 12 + ox * 0.18) % width;
    const sy = (i * 29 + t * (16 + (i % 7) * 6)) % height;
    const big = i % 4 === 0;
    ctx.fillStyle = big ? R.snowHi : i % 3 === 0 ? R.snow : R.snowMid;
    ctx.fillRect(Math.round(sx), Math.round(sy), big ? 2 : 1, big ? 2 : 1);
  }
}
