/**
 * ERA_1995 — Novgorod Rynok, Winter 1995.
 * NES tiled brick/snow market strip; teen walk/run. Full Bazar later.
 */

import type { StateManager } from '@/core/StateManager';
import type { Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import { RYNOK_PAL } from '@/art/nesPalette';
import { fillBricks, nesBox, px } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';

const FLOOR_Y = 148;
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
      drawDistantRoofs(ctx, width, ox);

      ctx.save();
      ctx.translate(-ox, 0);

      drawBrickWall(ctx, worldW);
      drawGround(ctx, worldW, height);
      drawStall(ctx, 100, FLOOR_Y, 'FISH', R.fish, R.awningRed);
      drawStall(ctx, 200, FLOOR_Y, 'BREAD', R.bread, '#4060a0');
      drawStall(ctx, 320, FLOOR_Y, 'FURS', R.fur, '#a06830');
      drawGate(ctx);

      player.render(ctx, alpha);
      ctx.restore();

      // Title plate
      const title = 'NOVGOROD RYNOK - WINTER 1995';
      const tw = measureNesText(title, 1, 1) + 12;
      nesBox(ctx, Math.round((width - tw) / 2), 6, tw, 14, R.uiBox, R.uiBorder);
      drawNesTextCentered(ctx, title, width / 2, 10, R.uiText, 1, 1);

      drawSnowParticles(ctx, width, height, ox);

      const hint = 'A D / ARROWS WALK';
      drawNesText(ctx, hint, 8, height - 10, '#6ec6ff', 1, 1);
    },
  };
}

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  px(ctx, 0, 0, width, 40, R.skyTop);
  px(ctx, 0, 40, width, 30, R.skyMid);
  px(ctx, 0, 70, width, height - 70, R.skyLow);
  // Dither band
  ctx.fillStyle = R.skyMid;
  for (let x = 0; x < width; x += 2) {
    ctx.fillRect(x, 39, 1, 1);
    ctx.fillRect(x + 1, 70, 1, 1);
  }
}

function drawDistantRoofs(ctx: CanvasRenderingContext2D, width: number, ox: number): void {
  for (let i = 0; i < 10; i++) {
    const rx = Math.round(((i * 56 - ox * 0.28) % (width + 56)) - 28);
    px(ctx, rx, 52, 36, 22, R.roof);
    px(ctx, rx + 6, 44, 24, 10, R.roof);
    // Snow cap
    px(ctx, rx + 4, 44, 28, 2, R.roofSnow);
    px(ctx, rx + 10, 42, 16, 2, R.roofSnow);
    // Window dots
    px(ctx, rx + 10, 60, 2, 2, R.skyTop);
    px(ctx, rx + 20, 60, 2, 2, '#e8c56a');
  }
}

function drawBrickWall(ctx: CanvasRenderingContext2D, worldW: number): void {
  fillBricks(ctx, 0, 88, worldW, FLOOR_Y - 92, R.brick, R.brickDark, R.brickLight, 14, 7);
  // Concrete band under bricks
  px(ctx, 0, FLOOR_Y - 12, worldW, 8, R.concrete);
  px(ctx, 0, FLOOR_Y - 12, worldW, 1, R.concreteDark);
  for (let x = 0; x < worldW; x += 20) {
    px(ctx, x, FLOOR_Y - 10, 1, 6, R.concreteDark);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, worldW: number, height: number): void {
  px(ctx, 0, FLOOR_Y - 4, worldW, height - (FLOOR_Y - 4), R.snowMid);
  // Snow tile pattern
  for (let x = 0; x < worldW; x += 8) {
    for (let y = FLOOR_Y; y < height; y += 6) {
      const light = ((x / 8 + y / 6) % 2) === 0;
      px(ctx, x, y, 8, 6, light ? R.snow : R.snowMid);
    }
  }
  // Packed path
  px(ctx, 0, FLOOR_Y - 4, worldW, 3, R.snow);
  px(ctx, 0, FLOOR_Y - 2, worldW, 1, R.snowShadow);
  // Footprint / grit
  ctx.fillStyle = R.snowShadow;
  for (let x = 12; x < worldW; x += 22) {
    ctx.fillRect(x, FLOOR_Y + 8, 3, 1);
    ctx.fillRect(x + 8, FLOOR_Y + 14, 2, 1);
  }
}

function drawStall(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  label: string,
  goodsColor: string,
  awning: string,
): void {
  // Awning with stripes
  px(ctx, x, floorY - 46, 60, 10, awning);
  px(ctx, x, floorY - 46, 60, 2, R.awningStripe);
  for (let i = 0; i < 5; i++) {
    px(ctx, x + 4 + i * 12, floorY - 44, 6, 6, i % 2 === 0 ? awning : R.awningDark);
  }
  // Posts
  px(ctx, x + 4, floorY - 36, 3, 36, R.wood);
  px(ctx, x + 53, floorY - 36, 3, 36, R.wood);
  px(ctx, x + 4, floorY - 36, 3, 1, R.woodDark);
  // Counter
  px(ctx, x + 2, floorY - 20, 56, 12, R.wood);
  px(ctx, x + 2, floorY - 20, 56, 2, '#8a7050');
  px(ctx, x + 2, floorY - 10, 56, 2, R.woodDark);
  // Goods piles
  if (label === 'FISH') {
    px(ctx, x + 8, floorY - 26, 10, 5, goodsColor);
    px(ctx, x + 10, floorY - 27, 6, 2, '#88b0c8');
    px(ctx, x + 22, floorY - 25, 12, 4, goodsColor);
    px(ctx, x + 38, floorY - 26, 8, 5, '#5080a0');
    // Ice
    px(ctx, x + 8, floorY - 22, 40, 2, R.snow);
  } else if (label === 'BREAD') {
    px(ctx, x + 10, floorY - 26, 8, 5, goodsColor);
    px(ctx, x + 20, floorY - 28, 10, 7, '#d4b050');
    px(ctx, x + 32, floorY - 25, 8, 4, goodsColor);
    px(ctx, x + 42, floorY - 27, 6, 6, '#a88830');
    px(ctx, x + 22, floorY - 30, 6, 2, '#e8c870');
  } else {
    // Furs
    px(ctx, x + 8, floorY - 28, 14, 8, goodsColor);
    px(ctx, x + 10, floorY - 30, 10, 3, '#a88868');
    px(ctx, x + 26, floorY - 26, 12, 6, '#6a4830');
    px(ctx, x + 40, floorY - 28, 10, 8, goodsColor);
    px(ctx, x + 42, floorY - 26, 6, 4, '#c4a888');
  }
  // Sign board
  nesBox(ctx, x + 12, floorY - 56, 36, 10, R.uiBox, R.awningStripe, false);
  drawNesTextCentered(ctx, label, x + 30, floorY - 53, R.uiText, 1, 1);
}

function drawGate(ctx: CanvasRenderingContext2D): void {
  // Wooden arch / exit
  px(ctx, 438, FLOOR_Y - 56, 10, 56, R.gate);
  px(ctx, 462, FLOOR_Y - 56, 10, 56, R.gate);
  px(ctx, 438, FLOOR_Y - 60, 34, 8, R.wood);
  px(ctx, 440, FLOOR_Y - 58, 30, 2, '#8a7050');
  // Cross beam detail
  px(ctx, 448, FLOOR_Y - 40, 14, 3, R.woodDark);
  px(ctx, 448, FLOOR_Y - 28, 14, 3, R.woodDark);
  // Snow on top
  px(ctx, 436, FLOOR_Y - 62, 38, 3, R.snow);
  px(ctx, 440, FLOOR_Y - 64, 10, 2, R.snow);
  px(ctx, 458, FLOOR_Y - 64, 8, 2, R.snow);
}

function drawSnowParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ox: number,
): void {
  const t = performance.now() / 1000;
  for (let i = 0; i < 28; i++) {
    const sx = (i * 47 + Math.sin(t * 0.7 + i) * 10 + ox * 0.15) % width;
    const sy = (i * 29 + t * (18 + (i % 6) * 7)) % height;
    const big = i % 5 === 0;
    ctx.fillStyle = big ? R.snow : R.snowMid;
    ctx.fillRect(Math.round(sx), Math.round(sy), big ? 2 : 1, big ? 2 : 1);
  }
}
