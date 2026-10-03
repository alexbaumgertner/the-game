/**
 * ERA_2026 — хрущёвка Зуича.
 * Интро: за компом → рыжая кошка → комод → дневник 1995 → Level Select.
 * Пиво: pickups + BeerSystem («Применить бухло»).
 */

import type { StateManager } from '@/core/StateManager';
import { ART_SCALE, LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { BeerSystem } from '@/systems/BeerSystem';
import { APT_PAL, CAT_PAL } from '@/art/segaPalette';
import {
  ditherRect,
  fillPattern,
  greaseStain,
  px,
  segaBox,
  speckles,
  woodGrain,
} from '@/art/pixelDraw';
import {
  drawInteractPrompt,
  drawUiText,
  drawUiTextCentered,
  HotspotHintClock,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import { ParallaxStack } from '@/render/ParallaxLayer';
import { applyLightingOverlay } from '@/render/LightingOverlay';
import { DialogueSystem, type DialogueScript } from '@/systems/DialogueSystem';

const WIDTH = LOGICAL_WIDTH;
const FLOOR_Y = 192;
const PROMPT_Y = 210;
const P = APT_PAL;
/** Desk / PC seat X. */
const DESK_X = 92;
/** Dresser (комод) hotspot. */
const DRESSER_X = 236;
const DRESSER_W = 70;

interface BeerCan {
  x: number;
  taken: boolean;
}

export type OverlayMode = 'none' | 'photo' | 'toast' | 'diary';

export interface ApartmentSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: BeerSystem;
}

const INTRO_SCRIPT: DialogueScript = {
  id: 'zuich_intro',
  start: 'hello',
  lines: {
    hello: {
      speaker: 'Зуич',
      text: 'Я — Зуич.',
      next: 'cat_ask',
    },
    cat_ask: {
      speaker: 'Кошка',
      text: 'Как дела?',
      next: 'pupupu',
    },
    pupupu: {
      speaker: 'Зуич',
      text: 'Пу-пу-пу.',
      next: 'cat_feed',
    },
    cat_feed: {
      speaker: 'Кошка',
      text: 'Посмотри в комоде корм.',
      next: null,
    },
  },
};

export function createApartment2026Scene(deps: ApartmentSceneDeps) {
  const { states, player, hud, beer } = deps;

  let overlay: OverlayMode = 'none';
  let toast = '';
  let toastTimer = 0;
  let diaryCursor = 0;
  let prompt = 'ИССЛЕДУЙ КВАРТИРУ';
  let time = 0;
  let depthCam = 0;
  const stack = new ParallaxStack();
  const dialogue = new DialogueSystem();
  let introStarted = false;
  let beerCans: BeerCan[] = [];
  const hotspotHints = new HotspotHintClock();

  const showToast = (msg: string, seconds = 1.6): void => {
    toast = msg;
    toastTimer = seconds;
    overlay = 'toast';
  };

  const refreshObjective = (): void => {
    if (!states.flags.introDone) {
      prompt = 'Я — ЗУИЧ';
      hud.set({ objective: 'Слушай диалог' });
      return;
    }
    if (!states.flags.diaryUnlocked) {
      prompt = 'ВСТАНЬ И ПОДОЙДИ К КОМОДУ';
      hud.set({ objective: 'Открой комод' });
      return;
    }
    if (states.flags.level1Cleared && !states.flags.level2Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 2 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 2' });
    } else if (states.flags.level2Cleared) {
      prompt = 'ДНЕВНИК - ВОСПОМИНАНИЯ';
      hud.set({ objective: 'Дневник - повтор' });
    } else {
      prompt = 'ДНЕВНИК - ВЫБОР УРОВНЯ';
      hud.set({ objective: 'Дневник - ур. 1' });
    }
  };

  const nearDresser = (): boolean =>
    player.x >= DRESSER_X && player.x <= DRESSER_X + DRESSER_W;

  const nearBeer = (): BeerCan | null => {
    for (const c of beerCans) {
      if (!c.taken && Math.abs(player.x - c.x) < 18) return c;
    }
    return null;
  };

  const activePrompt = (): string | null => {
    if (overlay !== 'none' || dialogue.isOpen) return null;
    if (!states.flags.introDone) return null;
    if (nearDresser() && !states.flags.diaryUnlocked) return 'Открыть комод';
    if (nearDresser() && states.flags.diaryUnlocked) return 'Открыть дневник';
    const can = nearBeer();
    if (can) return 'Взять пиво';
    return null;
  };

  const tryInteract = (): void => {
    const input = states.input;
    if (!input) return;
    if (!input.justPressed('interact') && !input.justPressed('confirm')) return;
    if (player.inspecting) return;
    if (dialogue.isOpen) return;

    if (overlay === 'photo') {
      // After photo → level select
      overlay = 'diary';
      diaryCursor =
        states.flags.level1Cleared && !states.flags.level2Cleared ? 1 : 0;
      hud.set({ objective: 'Выбери воспоминание' });
      return;
    }
    if (overlay === 'toast') {
      overlay = 'none';
      toastTimer = 0;
      return;
    }
    if (overlay === 'diary') return;

    if (!states.flags.introDone) return;

    // Beer pickup
    const can = nearBeer();
    if (can) {
      player.beginInspect(0.35);
      can.taken = true;
      beer.pickup(1);
      showToast('Банка пива.');
      return;
    }

    if (nearDresser()) {
      player.beginInspect(0.4);
      if (!states.flags.diaryUnlocked) {
        states.setFlag('diaryUnlocked', true);
        states.setFlag('seenPhoto', true);
        overlay = 'photo';
        refreshObjective();
        return;
      }
      overlay = 'diary';
      diaryCursor =
        states.flags.level1Cleared && !states.flags.level2Cleared ? 1 : 0;
      hud.set({ objective: 'Выбери воспоминание' });
    }
  };

  const tryDrink = (): void => {
    const input = states.input;
    if (!input?.justPressed('beer')) return;
    if (dialogue.isOpen || overlay === 'diary' || overlay === 'photo') return;
    if (beer.drink()) {
      showToast('Бухло принято.');
    } else if (beer.cans <= 0) {
      showToast('Нет пива. Ищи банки.');
    }
  };

  const level2Unlocked = (): boolean => states.flags.level1Cleared;

  const updateDiarySelect = (dt: number): void => {
    void dt;
    const input = states.input;
    if (!input) return;

    const maxCursor = level2Unlocked() ? 1 : 0;

    if (input.justPressed('up') || input.justPressed('left')) {
      diaryCursor = Math.max(0, diaryCursor - 1);
    }
    if (input.justPressed('down') || input.justPressed('right')) {
      diaryCursor = Math.min(maxCursor, diaryCursor + 1);
    }

    if (input.justPressed('confirm') || input.justPressed('interact')) {
      if (diaryCursor === 0) {
        states.setFlag('level1Selected', true);
        overlay = 'none';
        states.goto('rynok_1995', { era: 'ERA_1995', data: { level: 1 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 1 && level2Unlocked()) {
        states.setFlag('level2Selected', true);
        overlay = 'none';
        states.goto('podezd_1995', { era: 'ERA_1995', data: { level: 2 }, fadeSeconds: 0.55 });
      }
    }
  };

  const updateIntroDialogue = (): void => {
    const input = states.input;
    if (!input || !dialogue.isOpen) return;
    if (
      input.justPressed('confirm') ||
      input.justPressed('interact') ||
      input.justPressed('punch')
    ) {
      dialogue.advance();
    }
  };

  return {
    enter(): void {
      beer.resetForApartment();
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.setFloorY(FLOOR_Y);
      player.x = DESK_X;
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 52;
      overlay = 'none';
      toast = '';
      toastTimer = 0;
      diaryCursor = 0;
      dialogue.resetSilent();
      introStarted = false;
      hotspotHints.clear();
      beerCans = [
        { x: 48, taken: false },
        { x: 168, taken: false },
        { x: 300, taken: false },
      ];
      hud.set({
        hp: player.hp,
        maxHp: MAX_FORTITUDE,
        maxFortitude: MAX_FORTITUDE,
        eraLabel: 'ЗУИЧ · 2026',
        levelTitle: 'Хрущёвка',
        fortitude: player.mentalFortitude,
        swagger: 0,
        showSwagger: false,
        paused: false,
      });
      refreshObjective();

      if (!states.flags.introDone) {
        dialogue.open(INTRO_SCRIPT, () => {
          states.setFlag('introDone', true);
          showToast('Встань и подойди к комоду.');
          refreshObjective();
        });
        introStarted = true;
      }
    },

    exit(): void {
      overlay = 'none';
      dialogue.resetSilent();
    },

    update(dt: number): void {
      time += dt;
      player.update(dt);
      depthCam += ((player.x - WIDTH / 2) * 0.08 - depthCam) * Math.min(1, dt * 4);

      // Thirst only after the player can walk / explore
      if (states.flags.introDone) beer.update(dt);

      if (!introStarted && !states.flags.introDone) {
        dialogue.open(INTRO_SCRIPT, () => {
          states.setFlag('introDone', true);
          showToast('Встань и подойди к комоду.');
          refreshObjective();
        });
        introStarted = true;
      }

      if (dialogue.isOpen) {
        dialogue.update(dt);
        updateIntroDialogue();
        return;
      }

      if (overlay === 'diary') {
        updateDiarySelect(dt);
        return;
      }

      if (overlay === 'photo') {
        tryInteract();
        return;
      }

      tryDrink();

      if (overlay === 'toast') {
        toastTimer -= dt;
        if (toastTimer <= 0) overlay = 'none';
      }

      const frozen = beer.isFrozen;
      const axis = frozen ? 0 : (states.input?.axisX() ?? 0);
      if (states.flags.introDone) {
        player.applyWalk(axis, dt, 28, WIDTH - 28);
      }
      tryInteract();
    },

    render(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      _ctx: unknown,
      width: number,
      height: number,
    ): void {
      stack.setLayers([
        {
          id: 'room',
          speedRatio: 0,
          zIndex: 0,
          screenSpace: true,
          draw: (c) => drawApartment(c, width, height, depthCam, beerCans),
        },
        {
          id: 'gameplay',
          speedRatio: 0,
          zIndex: 10,
          screenSpace: true,
          draw: (c) => {
            player.render(c, alpha);
            drawCat(c, time);
            if (!dialogue.isOpen && overlay === 'none') {
              drawHotspotHints(c, states, beerCans, time, player.x, hotspotHints);
            }
          },
        },
        {
          id: 'lighting',
          speedRatio: 0,
          zIndex: 20,
          screenSpace: true,
          draw: (c, _s, _cam, w, h) => {
            applyLightingOverlay(c, 0, w, h, {
              ambient: { color: 'rgba(34, 30, 54, 0.40)' },
              points: [
                {
                  kind: 'point',
                  x: 104,
                  y: 100,
                  radius: 38,
                  color: '#ffd878',
                  screenSpace: true,
                },
                {
                  kind: 'point',
                  x: 244,
                  y: 70,
                  radius: 28,
                  color: '#7090c8',
                  screenSpace: true,
                },
              ],
              cones: [],
              time,
            }, ART_SCALE);
          },
        },
      ]);
      stack.render(ctx, depthCam, width, height);

      // Bottom guidance only when not already showing a world ↑ CTA
      if (overlay === 'none' && !dialogue.isOpen && !activePrompt() && prompt) {
        drawPromptBar(ctx, width, prompt);
      }

      if (overlay === 'photo') drawPhotoOverlay(ctx, width, height);
      if (overlay === 'toast') drawToast(ctx, width, height, toast);
      if (overlay === 'diary') {
        drawDiarySelect(ctx, width, height, diaryCursor, {
          level1Cleared: states.flags.level1Cleared,
          level2Cleared: states.flags.level2Cleared,
        });
      }

      if (dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      }

      if (states.flags.introDone) {
        // Gray + мыслепоток under beer chrome so HUD stays readable.
        beer.renderCrisis(ctx, width, height);
        beer.renderHud(ctx, width);
      }
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },
  };
}

function drawApartment(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  depthCam: number,
  beerCans: BeerCan[],
): void {
  px(ctx, 0, 0, width, height, P.wallDeep);

  // Wallpaper base + floral motif (drawn midtones, not chunky checks)
  fillPattern(ctx, 0, 0, width, FLOOR_Y - 10, P.wallBase, P.wallpaperMotif, 8, 'diamonds');
  speckles(ctx, 0, 0, width, FLOOR_Y - 10, P.wallpaperDot, 5, 3);
  speckles(ctx, 0, 8, width, FLOOR_Y - 20, P.wallFloral, 11, 7);
  speckles(ctx, 4, 12, width - 8, FLOOR_Y - 28, P.wallFloralLeaf, 13, 2);
  // Vertical seam strips
  for (let x = 28; x < width; x += 44) {
    px(ctx, x, 8, 2, FLOOR_Y - 22, P.wallpaperShadow);
    px(ctx, x + 1, 8, 1, FLOOR_Y - 22, P.wallpaper);
    ditherRect(ctx, x - 1, 20, 1, FLOOR_Y - 40, P.wallDark, P.wallpaperShadow);
  }
  // Nuanced grease / nicotine stains
  greaseStain(ctx, 14, 36, 48, 56, P.wallStainDeep, P.wallStainMid, P.wallStainEdge);
  greaseStain(ctx, 150, 16, 58, 42, P.wallStainDeep, P.wallStainMid, P.wallDark);
  greaseStain(ctx, 248, 44, 44, 48, P.wallpaperShadow, P.wallStainMid, P.wallStainEdge);
  greaseStain(ctx, 70, 70, 30, 28, P.wallStainMid, P.wallStainEdge, P.wallBase);
  ditherRect(ctx, 0, 0, width, 10, P.wallDeep, P.wallDark);

  drawWindow(ctx, depthCam);
  drawRedDoor(ctx);
  drawNuMetalPoster(ctx);
  drawFloor(ctx, width, height);
  drawBed(ctx);
  drawDeskAndPc(ctx);
  drawComputerJunk(ctx);
  drawBeerCorner(ctx);
  drawDresser(ctx);
  drawLamp(ctx);
  drawBaseboard(ctx, width);

  for (const c of beerCans) {
    if (!c.taken) drawBeerCan(ctx, c.x, FLOOR_Y - 8);
  }

  // Soft lamp glow seeds (lighting overlay carries the bloom)
  ctx.fillStyle = 'rgba(255, 200, 88, 0.35)';
  for (const [gx, gy] of [
    [96, 86], [104, 78], [112, 90], [108, 98],
  ] as const) {
    ctx.fillRect(gx, gy, 1, 1);
  }
}

function drawRedDoor(ctx: CanvasRenderingContext2D): void {
  // Old Soviet red apartment door — multi-shade panels + wear
  px(ctx, 0, FLOOR_Y - 86, 22, 76, '#4a1414');
  px(ctx, 2, FLOOR_Y - 84, 18, 72, '#8a2828');
  px(ctx, 3, FLOOR_Y - 82, 16, 2, '#c05050');
  px(ctx, 3, FLOOR_Y - 82, 2, 68, '#a84040');
  px(ctx, 17, FLOOR_Y - 82, 2, 68, '#601818');
  // Panels
  px(ctx, 5, FLOOR_Y - 78, 12, 22, '#782020');
  px(ctx, 6, FLOOR_Y - 77, 10, 2, '#a03838');
  px(ctx, 6, FLOOR_Y - 76, 1, 18, '#903030');
  px(ctx, 5, FLOOR_Y - 50, 12, 28, '#6a1818');
  px(ctx, 6, FLOOR_Y - 49, 10, 2, '#882828');
  speckles(ctx, 4, FLOOR_Y - 80, 14, 60, '#5a1010', 4, 2);
  // Peephole + brass handle
  px(ctx, 10, FLOOR_Y - 58, 4, 4, '#202028');
  px(ctx, 11, FLOOR_Y - 57, 2, 2, '#a0a8b0');
  px(ctx, 11, FLOOR_Y - 57, 1, 1, '#e0e8f0');
  px(ctx, 16, FLOOR_Y - 48, 5, 3, P.brass);
  px(ctx, 17, FLOOR_Y - 47, 3, 1, P.brassHi);
  px(ctx, 18, FLOOR_Y - 46, 1, 1, P.brassDim);
}

function drawNuMetalPoster(ctx: CanvasRenderingContext2D): void {
  // Stylized nu-metal / Aerials-vibe — painted desert dusk + lone figure.
  // Original composition (no logos / no copyrighted art 1:1). Must read clearly vs wallpaper.
  const x = 136;
  const y = 12;
  const w = 62;
  const h = 58;

  px(ctx, x + 3, y + 3, w, h, '#2a2018');
  px(ctx, x, y, w, h, '#0c0c12');
  px(ctx, x + 1, y + 1, w - 2, h - 2, '#1a1420');
  px(ctx, x + 3, y + 3, w - 6, h - 6, '#e8d8b0');
  px(ctx, x + 4, y + 4, w - 8, 1, '#f0e8c8');
  px(ctx, x + 4, y + 4, w - 8, h - 8, '#2a1848');

  const ix = x + 5;
  const iy = y + 5;
  const iw = w - 10;
  const ih = h - 10;

  // Sky bands with dither seams
  px(ctx, ix, iy, iw, 8, '#2a1868');
  px(ctx, ix, iy + 6, iw, 8, '#4a2888');
  ditherRect(ctx, ix, iy + 12, iw, 6, '#7040a0', '#a05070');
  ditherRect(ctx, ix, iy + 16, iw, 6, '#a05070', '#e07830');
  px(ctx, ix, iy + 20, iw, 6, '#e88838');
  px(ctx, ix, iy + 24, iw, 3, '#f0a050');
  // Sun disk + rays
  px(ctx, ix + iw - 16, iy + 5, 9, 9, '#f8e070');
  px(ctx, ix + iw - 14, iy + 7, 5, 5, '#fff0a8');
  px(ctx, ix + iw - 12, iy + 9, 2, 2, '#ffffff');
  px(ctx, ix + 6, iy + 9, 12, 1, '#c090e0');
  px(ctx, ix + 16, iy + 13, 10, 1, '#d0a070');
  px(ctx, ix + 4, iy + 15, 6, 1, '#e0b890');

  // Layered dunes
  px(ctx, ix, iy + 26, iw, ih - 26, '#c88840');
  px(ctx, ix, iy + 24, iw, 4, '#f0b858');
  px(ctx, ix + 2, iy + 28, 18, 4, '#d89850');
  px(ctx, ix + 20, iy + 26, 22, 3, '#e0a860');
  px(ctx, ix + 40, iy + 29, 16, 4, '#d09048');
  ditherRect(ctx, ix, iy + 34, iw, ih - 34, '#b87838', '#8a5828');
  speckles(ctx, ix, iy + 28, iw, ih - 28, '#a06830', 3, 1);
  px(ctx, ix, iy + ih - 8, iw, 8, '#8a5028');
  px(ctx, ix + 10, iy + ih - 10, 28, 3, '#a06830');
  px(ctx, ix + 8, iy + ih - 6, 20, 1, '#704020');

  // Lone figure — shaded silhouette
  const fx = ix + Math.floor(iw / 2) - 1;
  const fy = iy + 18;
  px(ctx, fx, fy, 4, 5, '#080810');
  px(ctx, fx + 1, fy + 1, 2, 2, '#202028');
  px(ctx, fx, fy + 5, 4, 14, '#080810');
  px(ctx, fx + 3, fy + 6, 1, 4, '#303040');
  px(ctx, fx - 12, fy + 7, 28, 3, '#080810');
  px(ctx, fx - 14, fy + 6, 4, 3, '#101018');
  px(ctx, fx + 12, fy + 6, 4, 3, '#101018');
  px(ctx, fx - 1, fy + 18, 2, 8, '#080810');
  px(ctx, fx + 2, fy + 18, 2, 8, '#080810');
  px(ctx, fx + 3, fy + 6, 1, 3, '#404050');

  // Tape / wear
  px(ctx, x + 4, y + 4, 5, 3, '#d0c090');
  px(ctx, x + w - 9, y + 4, 5, 3, '#d0c090');
  px(ctx, x + 4, y + h - 7, 5, 3, '#c8b888');
  px(ctx, x + w - 5, y + h - 6, 3, 3, P.wallBase);
}

function drawComputerJunk(ctx: CanvasRenderingContext2D): void {
  // Finer PC clutter under / near window — more midtones & cables
  const baseX = 200;
  const fy = FLOOR_Y;
  // Tower case with vent slots
  px(ctx, baseX, fy - 30, 22, 20, '#3a3a48');
  px(ctx, baseX + 1, fy - 29, 20, 2, '#585868');
  px(ctx, baseX + 1, fy - 29, 1, 18, '#505060');
  px(ctx, baseX + 19, fy - 28, 1, 16, '#282830');
  for (let i = 0; i < 4; i++) {
    px(ctx, baseX + 4, fy - 24 + i * 3, 10, 1, '#202028');
    px(ctx, baseX + 4, fy - 23 + i * 3, 10, 1, '#484858');
  }
  px(ctx, baseX + 15, fy - 18, 3, 2, '#40c040');
  px(ctx, baseX + 15, fy - 15, 3, 2, '#c04040');
  // CRT with bezel + scanline hint
  px(ctx, baseX + 24, fy - 36, 22, 18, '#2a2a38');
  px(ctx, baseX + 25, fy - 35, 20, 2, '#484858');
  px(ctx, baseX + 26, fy - 33, 18, 11, '#1a2838');
  px(ctx, baseX + 27, fy - 32, 16, 2, '#2a4058');
  px(ctx, baseX + 28, fy - 28, 6, 3, '#406080');
  px(ctx, baseX + 36, fy - 27, 4, 2, '#60a080');
  px(ctx, baseX + 28, fy - 18, 14, 3, '#484858');
  px(ctx, baseX + 30, fy - 17, 4, 1, '#808890');
  // Motherboard / ISA cards
  px(ctx, baseX + 8, fy - 12, 30, 7, '#204028');
  px(ctx, baseX + 9, fy - 11, 28, 1, '#386040');
  px(ctx, baseX + 10, fy - 10, 3, 3, '#c0a040');
  px(ctx, baseX + 16, fy - 10, 3, 3, '#c0a040');
  px(ctx, baseX + 22, fy - 10, 3, 3, '#808890');
  px(ctx, baseX + 28, fy - 9, 8, 2, '#608070');
  // HDD / PSU bricks
  px(ctx, baseX + 46, fy - 16, 16, 8, '#303038');
  px(ctx, baseX + 47, fy - 15, 14, 1, '#505058');
  px(ctx, baseX + 48, fy - 12, 6, 2, '#202028');
  // Cables — multi-tone spaghetti
  px(ctx, baseX - 6, fy - 10, 12, 2, '#282830');
  px(ctx, baseX - 4, fy - 8, 2, 6, '#383840');
  px(ctx, baseX + 40, fy - 20, 2, 14, '#282830');
  px(ctx, baseX + 42, fy - 12, 10, 2, '#484850');
  px(ctx, baseX + 50, fy - 24, 2, 8, '#202830');
  // Sideways CRT
  px(ctx, baseX + 48, fy - 28, 16, 12, '#303040');
  px(ctx, baseX + 49, fy - 27, 14, 2, '#484858');
  px(ctx, baseX + 50, fy - 25, 12, 7, '#182028');
  px(ctx, baseX + 52, fy - 23, 4, 2, '#305060');
}

function drawFloor(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  px(ctx, 0, FLOOR_Y - 10, width, height - (FLOOR_Y - 10), P.floor);
  for (let x = 0; x < width; x += 12) {
    const tone = (x / 12) % 3;
    const col = tone === 0 ? P.floorLight : tone === 1 ? P.floorMid : P.floor;
    woodGrain(
      ctx,
      x,
      FLOOR_Y - 10,
      11,
      height - (FLOOR_Y - 10),
      col,
      P.floorLight,
      P.floorGrain,
      P.floorDark,
      true,
    );
    px(ctx, x + 11, FLOOR_Y - 10, 1, height - (FLOOR_Y - 10), P.floorDark);
    if (tone === 1) px(ctx, x + 4, FLOOR_Y + 14, 3, 1, P.floorLight);
  }
  ctx.fillStyle = P.floorDark;
  for (let x = 6; x < width; x += 12) {
    ctx.fillRect(x, FLOOR_Y + 5, 1, 1);
    ctx.fillRect(x + 3, FLOOR_Y + 16, 1, 1);
  }
}

function drawBeerCorner(ctx: CanvasRenderingContext2D): void {
  // Bottle pile left of bed
  const bx = 28;
  const fy = FLOOR_Y;
  const bottles = [
    [0, -18, '#3a6028'],
    [6, -20, '#2a4820'],
    [12, -16, '#4a7030'],
    [4, -12, '#305028'],
    [10, -14, '#284020'],
  ] as const;
  for (const [ox, oy, col] of bottles) {
    px(ctx, bx + ox, fy + oy, 4, 12, col);
    px(ctx, bx + ox + 1, fy + oy - 2, 2, 3, '#808890');
    px(ctx, bx + ox + 1, fy + oy + 2, 2, 2, '#a0c060');
  }
}

function drawBeerCan(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, x - 3, y - 9, 6, 11, '#c89030');
  px(ctx, x - 2, y - 8, 4, 2, '#f0c868');
  px(ctx, x - 2, y - 6, 1, 6, '#e0b050');
  px(ctx, x + 1, y - 6, 1, 6, '#a07020');
  px(ctx, x - 2, y - 10, 4, 2, '#a0a8b0');
  px(ctx, x - 1, y - 10, 2, 1, '#d0d8e0');
  px(ctx, x - 1, y - 4, 2, 3, '#c04040');
  px(ctx, x - 1, y - 3, 2, 1, '#e06060');
}

function drawWindow(ctx: CanvasRenderingContext2D, depthCam = 0): void {
  woodGrain(ctx, 200, 28, 92, 72, P.woodDark, P.woodHi, P.wood, P.woodDeep, false);
  px(ctx, 202, 30, 88, 68, P.wood);
  px(ctx, 204, 32, 84, 2, P.woodHi);
  px(ctx, 204, 32, 2, 64, P.woodHi);
  px(ctx, 204, 34, 80, 60, P.woodDeep);

  px(ctx, 208, 38, 72, 52, P.nightSky);
  ditherRect(ctx, 208, 38, 72, 10, P.nightSky, P.nightSkyMid);
  px(ctx, 208, 68, 72, 22, P.nightSkyMid);
  // Distant glow haze
  ditherRect(ctx, 220, 58, 40, 12, P.nightSkyMid, P.cityHi);

  const ox = Math.round(depthCam * 0.35);
  // City blocks with window grids
  const blocks = [
    [212, 58, 14, 32, P.city, P.cityMid],
    [228, 46, 18, 44, P.cityMid, P.cityHi],
    [248, 62, 12, 28, P.city, P.cityMid],
    [262, 50, 14, 40, P.cityMid, P.cityHi],
  ] as const;
  for (const [bx, by, bw, bh, c0, c1] of blocks) {
    px(ctx, bx + ox, by, bw, bh, c0);
    px(ctx, bx + ox + 1, by - 3, bw - 2, 3, c1);
    for (let wy = by + 3; wy < by + bh - 2; wy += 5) {
      for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) {
        px(ctx, wx + ox, wy, 2, 2, ((wx + wy) % 8 === 0 ? P.windowLight : P.windowLightDim));
      }
    }
  }

  const lights = [
    [216, 66], [220, 74], [232, 56], [238, 66], [242, 76],
    [252, 72], [266, 60], [270, 72], [274, 80],
  ] as const;
  for (const [lx, ly] of lights) {
    px(ctx, lx + ox, ly, 2, 2, P.windowLight);
  }

  px(ctx, 242, 38, 3, 52, P.woodMid);
  px(ctx, 243, 38, 1, 52, P.woodHi);
  px(ctx, 208, 62, 72, 3, P.woodMid);
  // Curtains with folds
  px(ctx, 206, 36, 14, 58, P.curtain);
  px(ctx, 208, 40, 3, 50, P.curtainHi);
  px(ctx, 211, 42, 2, 46, P.curtainFold);
  px(ctx, 214, 44, 2, 44, P.curtainDark);
  px(ctx, 278, 36, 14, 58, P.curtain);
  px(ctx, 280, 40, 3, 50, P.curtainHi);
  px(ctx, 283, 42, 2, 46, P.curtainFold);
  px(ctx, 286, 44, 2, 44, P.curtainDark);
  px(ctx, 204, 34, 84, 3, P.woodHi);
}

function drawBaseboard(ctx: CanvasRenderingContext2D, width: number): void {
  px(ctx, 0, FLOOR_Y - 12, width, 2, P.woodDark);
  px(ctx, 0, FLOOR_Y - 14, width, 2, P.wood);
}

function drawDeskAndPc(ctx: CanvasRenderingContext2D): void {
  woodGrain(ctx, 70, FLOOR_Y - 42, 58, 32, P.wood, P.woodHi, P.woodMid, P.woodDark, false);
  px(ctx, 72, FLOOR_Y - 40, 54, 2, P.woodHi);
  px(ctx, 72, FLOOR_Y - 40, 2, 28, P.woodHi);
  px(ctx, 74, FLOOR_Y - 12, 50, 2, P.woodDark);
  px(ctx, 74, FLOOR_Y - 10, 5, 10, P.woodDeep);
  px(ctx, 116, FLOOR_Y - 10, 5, 10, P.woodDeep);

  // CRT on desk — bezel + screen glow + scanlines
  px(ctx, 78, FLOOR_Y - 70, 28, 26, '#2a2a38');
  px(ctx, 80, FLOOR_Y - 68, 24, 2, '#585868');
  px(ctx, 80, FLOOR_Y - 66, 24, 18, '#102028');
  px(ctx, 82, FLOOR_Y - 64, 20, 2, '#204040');
  px(ctx, 82, FLOOR_Y - 62, 8, 3, '#408060');
  px(ctx, 82, FLOOR_Y - 58, 14, 2, '#306050');
  px(ctx, 82, FLOOR_Y - 54, 10, 2, '#284838');
  px(ctx, 84, FLOOR_Y - 52, 12, 1, '#183030');
  px(ctx, 86, FLOOR_Y - 44, 12, 4, '#484858');
  px(ctx, 88, FLOOR_Y - 43, 4, 1, '#808890');

  // Keyboard with key rows
  px(ctx, 78, FLOOR_Y - 46, 30, 5, '#3a3a48');
  px(ctx, 80, FLOOR_Y - 45, 26, 1, '#585868');
  for (let kx = 81; kx < 104; kx += 3) px(ctx, kx, FLOOR_Y - 44, 2, 1, '#686878');

  // Tower under desk
  px(ctx, 108, FLOOR_Y - 38, 14, 26, '#303040');
  px(ctx, 110, FLOOR_Y - 36, 10, 2, '#505060');
  px(ctx, 110, FLOOR_Y - 33, 10, 4, '#202028');
  px(ctx, 112, FLOOR_Y - 28, 3, 2, '#40a040');
  px(ctx, 112, FLOOR_Y - 24, 3, 2, '#a04040');
  px(ctx, 110, FLOOR_Y - 18, 8, 1, '#484858');
}

function drawDresser(ctx: CanvasRenderingContext2D): void {
  woodGrain(ctx, 244, FLOOR_Y - 54, 58, 44, P.wood, P.woodHi, P.woodMid, P.woodDark, true);
  px(ctx, 246, FLOOR_Y - 52, 54, 2, P.woodHi);
  px(ctx, 246, FLOOR_Y - 52, 2, 40, P.woodHi);
  px(ctx, 298, FLOOR_Y - 52, 2, 40, P.woodDark);

  const rows = [FLOOR_Y - 46, FLOOR_Y - 34, FLOOR_Y - 22];
  for (const ry of rows) {
    px(ctx, 248, ry, 50, 10, P.woodDark);
    px(ctx, 250, ry + 1, 46, 8, P.wood);
    px(ctx, 252, ry + 2, 42, 1, P.woodHi);
    speckles(ctx, 250, ry + 1, 46, 8, P.woodKnot, 5, ry);
    px(ctx, 266, ry + 4, 12, 3, P.brass);
    px(ctx, 268, ry + 4, 8, 1, P.brassHi);
    px(ctx, 270, ry + 5, 4, 1, P.brassDim);
  }
}

function drawBed(ctx: CanvasRenderingContext2D): void {
  woodGrain(ctx, 8, FLOOR_Y - 24, 68, 14, P.woodDark, P.woodHi, P.wood, P.woodDeep, false);
  px(ctx, 10, FLOOR_Y - 22, 64, 2, P.woodHi);
  px(ctx, 8, FLOOR_Y - 10, 68, 6, P.wood);
  px(ctx, 12, FLOOR_Y - 30, 60, 8, P.bedSheet);
  px(ctx, 14, FLOOR_Y - 29, 56, 1, P.bedSheetHi);
  px(ctx, 30, FLOOR_Y - 34, 42, 10, P.bedBlanket);
  px(ctx, 32, FLOOR_Y - 32, 38, 2, P.bedBlanketHi);
  px(ctx, 34, FLOOR_Y - 28, 34, 1, P.bedBlanketDark);
  speckles(ctx, 30, FLOOR_Y - 34, 42, 10, P.bedBlanketDark, 4, 1);
  px(ctx, 12, FLOOR_Y - 38, 20, 10, P.pillow);
  px(ctx, 14, FLOOR_Y - 36, 16, 3, P.pillowHi);
  px(ctx, 16, FLOOR_Y - 32, 12, 2, P.pillowShadow);
  px(ctx, 8, FLOOR_Y - 46, 6, 24, P.wood);
  px(ctx, 9, FLOOR_Y - 44, 1, 20, P.woodHi);
}

function drawLamp(ctx: CanvasRenderingContext2D): void {
  px(ctx, 130, FLOOR_Y - 48, 4, 18, P.woodDark);
  px(ctx, 126, FLOOR_Y - 56, 12, 8, P.brass);
  px(ctx, 128, FLOOR_Y - 54, 8, 2, P.brassHi);
  px(ctx, 129, FLOOR_Y - 58, 6, 2, P.lampGlow);
}

/** Ginger cat NPC — readable fur, ears, eyes (hi-detail drawn). */
function drawCat(ctx: CanvasRenderingContext2D, time: number): void {
  const C = CAT_PAL;
  const bob = Math.floor(time * 2) % 2;
  const x = 58;
  const y = FLOOR_Y - 10 + bob;

  // Body
  px(ctx, x, y - 11, 15, 9, C.fur);
  px(ctx, x + 1, y - 10, 13, 2, C.furHi);
  px(ctx, x + 2, y - 7, 11, 3, C.furMid);
  px(ctx, x + 3, y - 5, 9, 2, C.belly);
  speckles(ctx, x, y - 11, 15, 9, C.furDark, 3, 1);
  // Stripes
  px(ctx, x + 3, y - 9, 2, 1, C.stripe);
  px(ctx, x + 7, y - 8, 2, 1, C.stripe);
  px(ctx, x + 11, y - 9, 2, 1, C.stripe);
  px(ctx, x + 5, y - 6, 2, 1, C.stripe);

  // Head
  px(ctx, x + 10, y - 18, 9, 8, C.fur);
  px(ctx, x + 11, y - 17, 7, 2, C.furHi);
  px(ctx, x + 12, y - 14, 5, 2, C.furMid);
  // Ears (triangle-ish)
  px(ctx, x + 10, y - 22, 3, 4, C.fur);
  px(ctx, x + 11, y - 21, 1, 2, C.innerEar);
  px(ctx, x + 16, y - 22, 3, 4, C.fur);
  px(ctx, x + 17, y - 21, 1, 2, C.innerEar);
  px(ctx, x + 10, y - 22, 1, 1, C.outline);
  px(ctx, x + 18, y - 22, 1, 1, C.outline);
  // Eyes — green shine
  px(ctx, x + 12, y - 15, 2, 2, C.eye);
  px(ctx, x + 16, y - 15, 2, 2, C.eye);
  px(ctx, x + 12, y - 15, 1, 1, C.eyeHi);
  px(ctx, x + 16, y - 15, 1, 1, C.eyeHi);
  // Nose + muzzle
  px(ctx, x + 14, y - 13, 2, 1, C.nose);
  px(ctx, x + 14, y - 13, 1, 1, C.noseHi);
  px(ctx, x + 13, y - 12, 1, 1, C.outline);
  px(ctx, x + 16, y - 12, 1, 1, C.outline);
  // Whiskers
  px(ctx, x + 10, y - 13, 3, 1, C.whisker);
  px(ctx, x + 17, y - 13, 3, 1, C.whisker);
  px(ctx, x + 10, y - 12, 2, 1, C.whisker);
  px(ctx, x + 18, y - 12, 2, 1, C.whisker);

  // Tail — arched
  px(ctx, x - 5, y - 13, 6, 2, C.fur);
  px(ctx, x - 6, y - 18, 2, 6, C.furMid);
  px(ctx, x - 5, y - 19, 2, 2, C.furHi);
  px(ctx, x - 6, y - 16, 1, 1, C.stripe);
  // Front paws
  px(ctx, x + 2, y - 3, 3, 2, C.furHi);
  px(ctx, x + 8, y - 3, 3, 2, C.furHi);
}

function drawHotspotHints(
  ctx: CanvasRenderingContext2D,
  states: StateManager,
  beerCans: BeerCan[],
  timeSec: number,
  playerX: number,
  clock: HotspotHintClock,
): void {
  if (!states.flags.introDone) return;

  // Proximity: on enter → compact ↑+text for ~5s, then ↑ only until leave/re-enter.
  const nearDresser = playerX >= DRESSER_X && playerX <= DRESSER_X + DRESSER_W;
  const dresser = clock.sample('dresser', nearDresser, timeSec);
  if (dresser.active) {
    const label = states.flags.diaryUnlocked ? 'Открыть дневник' : 'Открыть комод';
    drawInteractPrompt(ctx, DRESSER_X + DRESSER_W / 2, FLOOR_Y - 58, label, timeSec, {
      size: 5.5,
      showLabel: dresser.showLabel,
    });
  }

  for (let i = 0; i < beerCans.length; i++) {
    const c = beerCans[i]!;
    if (c.taken) {
      clock.sample(`beer-${i}`, false, timeSec);
      continue;
    }
    const near = Math.abs(playerX - c.x) < 18;
    const hint = clock.sample(`beer-${i}`, near, timeSec);
    if (!hint.active) continue;
    drawInteractPrompt(ctx, c.x, FLOOR_Y - 22, 'Взять пиво', timeSec, {
      size: 5.5,
      showLabel: hint.showLabel,
    });
  }
}

function drawPromptBar(ctx: CanvasRenderingContext2D, width: number, text: string): void {
  const tw = measureUiText(ctx, text, 7, 550);
  const bw = Math.min(width - 8, tw + 14);
  uiPanel(
    ctx,
    Math.round((width - bw) / 2),
    PROMPT_Y - 11,
    bw,
    13,
    'rgba(10,12,18,0.78)',
    'rgba(200,168,80,0.55)',
  );
  drawUiTextCentered(ctx, text, width / 2, PROMPT_Y - 8, P.uiText, 7, 550);
}

/** Family photo frame — young happy family, 1995. */
function drawPhotoOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(6, 6, 12, 0.88)';
  ctx.fillRect(0, 0, width, height);

  const bx = 52;
  const by = 28;
  const bw = 216;
  const bh = 128;
  segaBox(ctx, bx - 4, by - 4, bw + 8, bh + 8, P.frame, P.frameDark, {
    borderDark: P.woodDeep,
    inset: false,
  });
  // Warm outdoor / park feel
  px(ctx, bx, by, bw, bh, '#88b070');
  ditherRect(ctx, bx, by, bw, 40, '#a0c888', '#88b070');
  px(ctx, bx, by + 70, bw, 40, '#70a058');

  // Family silhouettes — parents + child, joyful
  // Father
  px(ctx, bx + 60, by + 48, 14, 28, '#3a4860');
  px(ctx, bx + 63, by + 40, 8, 10, '#e8c898');
  // Mother
  px(ctx, bx + 90, by + 50, 14, 26, '#a04860');
  px(ctx, bx + 93, by + 42, 8, 10, '#e8c898');
  px(ctx, bx + 92, by + 40, 10, 4, '#603040');
  // Child (young Zuich)
  px(ctx, bx + 78, by + 62, 10, 16, '#406080');
  px(ctx, bx + 80, by + 56, 6, 7, '#f0d0b0');
  // Hearts / love sparkles
  px(ctx, bx + 120, by + 36, 3, 3, '#e06070');
  px(ctx, bx + 140, by + 48, 2, 2, '#e08090');
  px(ctx, bx + 50, by + 44, 2, 2, '#e08090');

  px(ctx, bx, by + bh - 22, bw, 22, '#b09870');
  drawUiTextCentered(ctx, 'Год 1995, мы счастливы', width / 2, by + bh - 14, '#3a2a18', 8, 650);
  drawUiTextCentered(ctx, 'E / Enter — дальше', width / 2, height - 16, P.uiText, 7, 550);
}

function drawToast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
): void {
  const label = text;
  const tw = measureUiText(ctx, label, 8, 600);
  const bw = Math.min(width - 24, tw + 20);
  const bx = Math.round((width - bw) / 2);
  const by = Math.round(height / 2 - 12);
  uiPanel(ctx, bx, by, bw, 22, 'rgba(12,14,20,0.9)', 'rgba(200,168,80,0.75)');
  drawUiTextCentered(ctx, label, width / 2, by + 6, P.uiText, 8, 600);
}

function drawDiarySelect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cursor: number,
  progress: { level1Cleared: boolean; level2Cleared: boolean },
): void {
  ctx.fillStyle = 'rgba(6, 4, 10, 0.9)';
  ctx.fillRect(0, 0, width, height);

  const bx = 32;
  const by = 28;
  const bw = width - 64;
  const bh = 148;
  segaBox(ctx, bx, by, bw, bh, '#2a1810', P.brass, { borderDark: P.brassDim });
  px(ctx, bx + 4, by + 4, bw - 8, bh - 8, '#5a3a20');
  px(ctx, bx + 6, by + 6, bw - 12, 2, '#7a5a38');

  drawUiTextCentered(ctx, 'Дневник — уровни', width / 2, by + 12, P.diaryPages, 9, 650);
  px(ctx, bx + 16, by + 28, bw - 32, 1, '#8a6a48');

  const levels = [
    {
      title: 'Ур. 1 — Новгород рынок',
      sub: progress.level1Cleared ? 'Пройден — повтор' : 'Зима 1995',
      locked: false,
    },
    {
      title: progress.level1Cleared ? 'Ур. 2 — Подъезд №7' : 'Ур. 2 — ???',
      sub: !progress.level1Cleared
        ? 'Закрыт — пройди ур. 1'
        : progress.level2Cleared
          ? 'Пройден — повтор'
          : 'Зима 1995',
      locked: !progress.level1Cleared,
    },
  ];

  levels.forEach((lvl, i) => {
    const ly = by + 46 + i * 36;
    const selected = !lvl.locked && i === cursor;
    if (selected) {
      segaBox(ctx, bx + 12, ly - 8, bw - 24, 30, '#3a2818', P.brass, {
        borderDark: P.brassDim,
        inset: false,
      });
    }
    const titleColor = lvl.locked ? '#6a5a50' : selected ? P.brassHi : P.diaryPages;
    drawUiText(ctx, `${selected ? '›' : ' '} ${lvl.title}`, bx + 16, ly, titleColor, 8, 600);
    drawUiText(ctx, lvl.sub, bx + 28, ly + 12, lvl.locked ? '#5a4a40' : '#a09080', 7, 500);
  });

  const hint =
    cursor === 1 && progress.level1Cleared
      ? 'Enter / E — начать ур. 2'
      : 'Enter / E — начать ур. 1';
  drawUiTextCentered(ctx, hint, width / 2, by + bh - 16, P.uiText, 7, 550);
}
