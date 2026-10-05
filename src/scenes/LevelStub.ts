/**
 * Shared «Скоро» stub for levels 9–12 until dedicated scenes land.
 */

import type { GameEra, SceneContext, SceneId, StateManager } from '@/core/StateManager';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { APT_PAL } from '@/art/segaPalette';
import { px, segaBox } from '@/art/pixelDraw';
import { drawUiTextCentered, measureUiText, uiPanel } from '@/art/uiFont';

const P = APT_PAL;
const WIDTH = LOGICAL_WIDTH;

export interface StubLevelDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  tea: TeaSystem;
}

export interface StubLevelConfig {
  scene: SceneId;
  era: GameEra;
  title: string;
  yearLabel: string;
}

export function createLevelStubScene(deps: StubLevelDeps, config: StubLevelConfig) {
  const { states, player, hud, tea } = deps;
  let time = 0;
  let pulse = 0;

  const returnHome = (): void => {
    states.goto('apartment_2026', {
      era: 'ERA_2026',
      fadeSeconds: 0.4,
      data: { fromStub: config.scene },
    });
  };

  return {
    enter(_ctx: SceneContext): void {
      tea.pauseForFlashback();
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = WIDTH * 0.5;
      player.y = 192;
      player.vx = 0;
      hud.set({
        hp: player.hp,
        maxHp: MAX_FORTITUDE,
        maxFortitude: MAX_FORTITUDE,
        fortitude: player.mentalFortitude,
        swagger: 0,
        showSwagger: false,
        eraLabel: `ЗУИЧ · ${config.yearLabel}`,
        levelTitle: config.title,
        objective: 'Скоро — Esc в квартиру',
        paused: false,
      });
      time = 0;
      pulse = 0;
    },

    exit(): void {
      /* no-op */
    },

    update(dt: number): void {
      time += dt;
      pulse += dt;
      const input = states.input;
      if (!input) return;
      if (
        input.justPressed('confirm') ||
        input.justPressed('interact') ||
        input.justPressed('punch')
      ) {
        returnHome();
      }
    },

    render(
      ctx: CanvasRenderingContext2D,
      _alpha: number,
      _ctxScene: SceneContext,
      width: number,
      height: number,
    ): void {
      // Cold stub backdrop
      px(ctx, 0, 0, width, height, '#141820');
      for (let y = 0; y < height; y += 8) {
        px(ctx, 0, y, width, 1, '#1a2230');
      }

      const bw = 200;
      const bh = 88;
      const bx = Math.round((width - bw) / 2);
      const by = Math.round((height - bh) / 2) - 8;
      segaBox(ctx, bx, by, bw, bh, '#243040', '#708898', { borderDark: '#405060' });
      px(ctx, bx + 4, by + 4, bw - 8, bh - 8, '#1c2838');

      const bob = Math.sin(pulse * 2.2) * 1.5;
      drawUiTextCentered(ctx, 'Скоро', width / 2, by + 18 + bob, '#e8e0c8', 14, 700);
      drawUiTextCentered(ctx, config.title, width / 2, by + 40, P.brassHi, 8, 600);
      drawUiTextCentered(ctx, config.yearLabel, width / 2, by + 54, '#90a0b0', 7, 500);

      const hint = 'E / Enter — в квартиру';
      const hw = measureUiText(ctx, hint, 6.5, 550) + 14;
      uiPanel(
        ctx,
        Math.round((width - hw) / 2),
        by + bh + 10,
        hw,
        14,
        'rgba(10,12,18,0.85)',
        'rgba(140,160,180,0.5)',
      );
      drawUiTextCentered(ctx, hint, width / 2, by + bh + 13, '#c8d0d8', 6.5, 550);

      void time;
    },

    getDialogue() {
      return { isOpen: false, resetSilent() {}, hitTest: () => null } as never;
    },
  };
}

export function createArmiya2010Scene(deps: StubLevelDeps) {
  return createLevelStubScene(deps, {
    scene: 'armiya_2010',
    era: 'ERA_2010',
    title: 'Армия',
    yearLabel: '2010',
  });
}

export function createRehab2015Scene(deps: StubLevelDeps) {
  return createLevelStubScene(deps, {
    scene: 'rehab_2015',
    era: 'ERA_2015',
    title: 'Распорядок',
    yearLabel: '2015',
  });
}

export function createKrug2015Scene(deps: StubLevelDeps) {
  return createLevelStubScene(deps, {
    scene: 'krug_2015',
    era: 'ERA_2015',
    title: 'Круг',
    yearLabel: '2015',
  });
}

export function createFinale2026Scene(deps: StubLevelDeps) {
  return createLevelStubScene(deps, {
    scene: 'finale_2026',
    era: 'ERA_2026',
    title: 'Финал',
    yearLabel: 'сейчас',
  });
}
