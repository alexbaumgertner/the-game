/**
 * ERA_1995 stub — Novgorod Rynok, Winter 1995.
 * Side-scroll placeholder; teen_* player. Full Bazar/waves land in later phases.
 */

import type { StateManager } from '@/core/StateManager';
import type { Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';

const FLOOR_Y = 148;

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
        objective: 'Rynok stub — walk the strip',
      });
    },

    exit(): void {
      // nothing
    },

    update(dt: number): void {
      player.update(dt);
      const axis = states.input?.axisX() ?? 0;
      player.applyWalk(axis, dt, 20, worldW - 20);

      // Simple camera follow
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

      // Winter sky
      ctx.fillStyle = '#1a2230';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#243044';
      ctx.fillRect(0, 0, width, 70);

      // Distant roofs (parallax-ish)
      ctx.fillStyle = '#2a3448';
      for (let i = 0; i < 8; i++) {
        const rx = ((i * 64 - ox * 0.3) % (width + 64)) - 32;
        ctx.fillRect(Math.round(rx), 48, 40, 30);
        ctx.fillRect(Math.round(rx + 8), 40, 24, 10);
      }

      ctx.save();
      ctx.translate(-ox, 0);

      // Ground / snow
      ctx.fillStyle = '#c8d0d8';
      ctx.fillRect(0, FLOOR_Y - 4, worldW, height - (FLOOR_Y - 4));
      ctx.fillStyle = '#a8b4c0';
      ctx.fillRect(0, FLOOR_Y - 4, worldW, 2);
      // Snow patches
      ctx.fillStyle = '#e8eef4';
      for (let x = 0; x < worldW; x += 28) {
        ctx.fillRect(x + 4, FLOOR_Y + 6, 12, 2);
      }

      // Stall placeholders
      drawStall(ctx, 100, FLOOR_Y, 'FISH');
      drawStall(ctx, 200, FLOOR_Y, 'BREAD');
      drawStall(ctx, 320, FLOOR_Y, 'FURS');

      // Gate / exit marker (future win)
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(440, FLOOR_Y - 48, 8, 48);
      ctx.fillRect(460, FLOOR_Y - 48, 8, 48);
      ctx.fillStyle = '#3a3028';
      ctx.fillRect(440, FLOOR_Y - 52, 28, 6);

      player.render(ctx, alpha);
      ctx.restore();

      // Title plate
      ctx.fillStyle = 'rgba(10, 10, 12, 0.7)';
      ctx.fillRect(60, 8, 200, 22);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '7px monospace';
      ctx.fillText('NOVGOROD RYNOK · WINTER 1995', 72, 22);

      // Snow flakes (screen space)
      ctx.fillStyle = '#e8eef4';
      const t = performance.now() / 1000;
      for (let i = 0; i < 18; i++) {
        const sx = (i * 47 + Math.sin(t + i) * 8 + ox * 0.2) % width;
        const sy = (i * 31 + t * (20 + (i % 5) * 8)) % height;
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }

      ctx.fillStyle = '#6ec6ff';
      ctx.font = '5px monospace';
      ctx.fillText('← → / A D walk · Phase 3 adds brawl + Bazar', 8, height - 6);
    },
  };
}

function drawStall(ctx: CanvasRenderingContext2D, x: number, floorY: number, label: string): void {
  // Awning
  ctx.fillStyle = '#8b3030';
  ctx.fillRect(x, floorY - 42, 56, 8);
  ctx.fillStyle = '#6a2020';
  ctx.fillRect(x + 2, floorY - 38, 52, 4);
  // Posts
  ctx.fillStyle = '#4a3a28';
  ctx.fillRect(x + 4, floorY - 34, 3, 34);
  ctx.fillRect(x + 49, floorY - 34, 3, 34);
  // Counter
  ctx.fillStyle = '#5a4a38';
  ctx.fillRect(x + 2, floorY - 18, 52, 10);
  // Goods blobs
  ctx.fillStyle = '#c4a040';
  ctx.fillRect(x + 10, floorY - 24, 8, 6);
  ctx.fillStyle = '#6a8a6a';
  ctx.fillRect(x + 24, floorY - 22, 10, 4);
  ctx.fillStyle = '#a07050';
  ctx.fillRect(x + 38, floorY - 24, 6, 6);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '5px monospace';
  ctx.fillText(label, x + 14, floorY - 44);
}
