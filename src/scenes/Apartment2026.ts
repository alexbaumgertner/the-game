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
import { APT_PAL } from '@/art/segaPalette';
import { ditherRect, fillPattern, px, segaBox } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';
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
    if (nearDresser() && !states.flags.diaryUnlocked) return 'E - ОТКРЫТЬ КОМОД';
    if (nearDresser() && states.flags.diaryUnlocked) return 'E - ДНЕВНИК';
    const can = nearBeer();
    if (can) return 'E - ВЗЯТЬ ПИВО';
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
            drawHotspotHints(c, states, beerCans);
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
                  radius: 52,
                  color: '#ffc858',
                  screenSpace: true,
                },
                {
                  kind: 'point',
                  x: 244,
                  y: 70,
                  radius: 36,
                  color: '#6080c0',
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

      const p = activePrompt() ?? (overlay === 'none' && !dialogue.isOpen ? prompt : null);
      if (p && overlay === 'none' && !dialogue.isOpen) {
        drawPromptBar(ctx, width, p);
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
        beer.renderHud(ctx, width);
        beer.renderCrisis(ctx, width, height);
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

  // Greasy / stained wallpaper
  fillPattern(ctx, 0, 0, width, FLOOR_Y - 10, P.wallBase, P.wallpaperMotif, 14, 'diamonds');
  for (let x = 36; x < width; x += 52) {
    px(ctx, x, 10, 2, FLOOR_Y - 24, P.wallpaperShadow);
    px(ctx, x + 1, 10, 1, FLOOR_Y - 24, P.wallpaper);
  }
  // Oil / nicotine stains
  ditherRect(ctx, 20, 40, 40, 50, P.wallBase, '#6a5840');
  ditherRect(ctx, 160, 20, 50, 36, P.wallDark, '#5a4838');
  ditherRect(ctx, 260, 50, 36, 40, P.wallpaperShadow, '#4a3a28');
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

  // Lamp glow seeds
  ctx.fillStyle = P.lampGlow;
  const glowDots = [
    [88, 78], [96, 86], [104, 74], [112, 92], [120, 80],
    [128, 98], [136, 84], [100, 108], [116, 100], [140, 94],
  ] as const;
  for (const [gx, gy] of glowDots) {
    ctx.fillRect(gx, gy, 1, 1);
  }
}

function drawRedDoor(ctx: CanvasRenderingContext2D): void {
  // Old Soviet red apartment door (left wall)
  px(ctx, 0, FLOOR_Y - 86, 22, 76, '#6a2020');
  px(ctx, 2, FLOOR_Y - 84, 18, 72, '#8a2828');
  px(ctx, 3, FLOOR_Y - 82, 16, 2, '#a83838');
  px(ctx, 3, FLOOR_Y - 82, 2, 68, '#a04040');
  px(ctx, 4, FLOOR_Y - 70, 14, 40, '#782020');
  // Peephole + handle
  px(ctx, 10, FLOOR_Y - 58, 4, 4, '#303038');
  px(ctx, 11, FLOOR_Y - 57, 2, 2, '#808890');
  px(ctx, 16, FLOOR_Y - 48, 5, 3, P.brass);
  px(ctx, 17, FLOOR_Y - 47, 3, 1, P.brassHi);
}

function drawNuMetalPoster(ctx: CanvasRenderingContext2D): void {
  // Stylized nu-metal 2000s / Aerials-vibe tribute — desert + lone figure, NO logo/brand
  const x = 142;
  const y = 22;
  // Paper + black frame
  px(ctx, x, y, 50, 46, '#100818');
  px(ctx, x + 2, y + 2, 46, 42, '#c8b090');
  px(ctx, x + 3, y + 3, 44, 40, '#2a1848');
  // Purple/orange sky wash
  ditherRect(ctx, x + 4, y + 4, 42, 18, '#3a2060', '#e07038');
  px(ctx, x + 4, y + 4, 42, 6, '#504888');
  // Desert dunes
  px(ctx, x + 4, y + 24, 42, 16, '#c08848');
  px(ctx, x + 4, y + 22, 42, 4, '#e0a858');
  ditherRect(ctx, x + 4, y + 28, 42, 10, '#c08848', '#8a6030');
  // Lone figure, arms wide (aerial silhouette — original pixel tribute)
  px(ctx, x + 24, y + 14, 3, 12, '#101018');
  px(ctx, x + 16, y + 16, 20, 2, '#101018');
  px(ctx, x + 14, y + 15, 3, 2, '#181820');
  px(ctx, x + 34, y + 15, 3, 2, '#181820');
  px(ctx, x + 24, y + 10, 3, 4, '#181820');
  // Tiny sun
  px(ctx, x + 36, y + 8, 4, 4, '#f0c060');
  // Torn corners
  px(ctx, x + 46, y + 4, 2, 2, P.wallBase);
  px(ctx, x + 2, y + 40, 2, 2, P.wallBase);
}

function drawComputerJunk(ctx: CanvasRenderingContext2D): void {
  // Pile of PC junk under / near window
  const baseX = 200;
  const fy = FLOOR_Y;
  // Case
  px(ctx, baseX, fy - 28, 22, 18, '#3a3a48');
  px(ctx, baseX + 2, fy - 26, 18, 2, '#585868');
  px(ctx, baseX + 4, fy - 20, 8, 6, '#202028');
  px(ctx, baseX + 14, fy - 18, 4, 2, '#40c040');
  // CRT monitor
  px(ctx, baseX + 24, fy - 34, 20, 16, '#2a2a38');
  px(ctx, baseX + 26, fy - 32, 16, 10, '#1a2838');
  px(ctx, baseX + 28, fy - 30, 4, 2, '#406080');
  px(ctx, baseX + 28, fy - 18, 12, 4, '#484858');
  // Motherboard slab
  px(ctx, baseX + 10, fy - 12, 28, 6, '#204028');
  px(ctx, baseX + 12, fy - 11, 3, 3, '#c0a040');
  px(ctx, baseX + 18, fy - 11, 3, 3, '#c0a040');
  px(ctx, baseX + 24, fy - 10, 8, 2, '#808890');
  // Cables
  px(ctx, baseX - 4, fy - 8, 10, 2, '#282830');
  px(ctx, baseX + 40, fy - 14, 2, 12, '#282830');
  px(ctx, baseX + 42, fy - 10, 8, 2, '#383840');
  // Second CRT sideways
  px(ctx, baseX + 46, fy - 22, 14, 12, '#303040');
  px(ctx, baseX + 48, fy - 20, 10, 6, '#182028');
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
  px(ctx, x - 3, y - 8, 6, 10, '#d8a040');
  px(ctx, x - 2, y - 7, 4, 2, '#f0c868');
  px(ctx, x - 2, y - 9, 4, 2, '#808890');
  px(ctx, x - 1, y - 4, 2, 3, '#c04040');
}

function drawWindow(ctx: CanvasRenderingContext2D, depthCam = 0): void {
  px(ctx, 200, 28, 92, 72, P.woodDark);
  px(ctx, 202, 30, 88, 68, P.wood);
  px(ctx, 204, 32, 84, 2, P.woodHi);
  px(ctx, 204, 32, 2, 64, P.woodHi);
  px(ctx, 204, 34, 80, 60, P.woodDeep);

  px(ctx, 208, 38, 72, 52, P.nightSky);
  ditherRect(ctx, 208, 38, 72, 8, P.nightSky, P.nightSkyMid);
  px(ctx, 208, 70, 72, 20, P.nightSkyMid);

  const ox = Math.round(depthCam * 0.35);
  px(ctx, 212 + ox, 62, 14, 28, P.city);
  px(ctx, 214 + ox, 58, 10, 4, P.cityMid);
  px(ctx, 228 + ox, 50, 18, 40, P.cityMid);
  px(ctx, 230 + ox, 46, 14, 4, P.cityHi);
  px(ctx, 248 + ox, 66, 12, 24, P.city);
  px(ctx, 262 + ox, 54, 14, 36, P.cityMid);
  px(ctx, 264 + ox, 50, 10, 4, P.cityHi);

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
  px(ctx, 206, 36, 14, 58, P.curtain);
  px(ctx, 208, 40, 3, 50, P.curtainHi);
  px(ctx, 278, 36, 14, 58, P.curtain);
  px(ctx, 280, 40, 3, 50, P.curtainHi);
  px(ctx, 204, 34, 84, 3, P.woodHi);
}

function drawFloor(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  px(ctx, 0, FLOOR_Y - 10, width, height - (FLOOR_Y - 10), P.floor);
  for (let x = 0; x < width; x += 18) {
    const light = x % 36 === 0;
    px(ctx, x, FLOOR_Y - 10, 17, height - (FLOOR_Y - 10), light ? P.floorLight : P.floorMid);
    px(ctx, x + 17, FLOOR_Y - 10, 1, height - (FLOOR_Y - 10), P.floorDark);
    px(ctx, x + 4, FLOOR_Y + 2, 8, 1, P.floorGrain);
  }
}

function drawBaseboard(ctx: CanvasRenderingContext2D, width: number): void {
  px(ctx, 0, FLOOR_Y - 12, width, 2, P.woodDark);
  px(ctx, 0, FLOOR_Y - 14, width, 2, P.wood);
}

function drawBed(ctx: CanvasRenderingContext2D): void {
  px(ctx, 8, FLOOR_Y - 24, 68, 14, P.woodDark);
  px(ctx, 10, FLOOR_Y - 22, 64, 2, P.woodHi);
  px(ctx, 8, FLOOR_Y - 10, 68, 6, P.wood);
  px(ctx, 12, FLOOR_Y - 30, 60, 8, P.bedSheet);
  px(ctx, 30, FLOOR_Y - 34, 42, 10, P.bedBlanket);
  px(ctx, 32, FLOOR_Y - 32, 38, 2, P.bedBlanketHi);
  px(ctx, 12, FLOOR_Y - 38, 20, 10, P.pillow);
  px(ctx, 14, FLOOR_Y - 36, 16, 3, P.pillowHi);
  px(ctx, 8, FLOOR_Y - 46, 6, 24, P.wood);
}

function drawDeskAndPc(ctx: CanvasRenderingContext2D): void {
  // Desk
  px(ctx, 70, FLOOR_Y - 42, 58, 32, P.wood);
  px(ctx, 72, FLOOR_Y - 40, 54, 2, P.woodHi);
  px(ctx, 72, FLOOR_Y - 40, 2, 28, P.woodHi);
  px(ctx, 74, FLOOR_Y - 12, 50, 2, P.woodDark);
  px(ctx, 74, FLOOR_Y - 10, 5, 10, P.woodDeep);
  px(ctx, 116, FLOOR_Y - 10, 5, 10, P.woodDeep);

  // CRT on desk
  px(ctx, 78, FLOOR_Y - 70, 28, 26, '#2a2a38');
  px(ctx, 80, FLOOR_Y - 68, 24, 18, '#102028');
  px(ctx, 82, FLOOR_Y - 66, 8, 4, '#306050');
  px(ctx, 82, FLOOR_Y - 60, 14, 2, '#204038');
  px(ctx, 82, FLOOR_Y - 56, 10, 2, '#204038');
  px(ctx, 86, FLOOR_Y - 44, 12, 4, '#484858');

  // Keyboard
  px(ctx, 78, FLOOR_Y - 46, 30, 5, '#3a3a48');
  px(ctx, 80, FLOOR_Y - 45, 26, 1, '#585868');

  // Tower under desk
  px(ctx, 108, FLOOR_Y - 38, 14, 26, '#303040');
  px(ctx, 110, FLOOR_Y - 36, 10, 4, '#202028');
  px(ctx, 112, FLOOR_Y - 28, 3, 2, '#40a040');
}

function drawDresser(ctx: CanvasRenderingContext2D): void {
  px(ctx, 244, FLOOR_Y - 54, 58, 44, P.wood);
  px(ctx, 246, FLOOR_Y - 52, 54, 2, P.woodHi);
  px(ctx, 246, FLOOR_Y - 52, 2, 40, P.woodHi);
  px(ctx, 298, FLOOR_Y - 52, 2, 40, P.woodDark);

  const rows = [FLOOR_Y - 46, FLOOR_Y - 34, FLOOR_Y - 22];
  for (const ry of rows) {
    px(ctx, 248, ry, 50, 10, P.woodDark);
    px(ctx, 250, ry + 1, 46, 8, P.wood);
    px(ctx, 252, ry + 2, 42, 1, P.woodHi);
    px(ctx, 266, ry + 4, 12, 3, P.brass);
    px(ctx, 268, ry + 4, 8, 1, P.brassHi);
  }
}

function drawLamp(ctx: CanvasRenderingContext2D): void {
  px(ctx, 130, FLOOR_Y - 48, 4, 18, P.woodDark);
  px(ctx, 126, FLOOR_Y - 56, 12, 8, P.brass);
  px(ctx, 128, FLOOR_Y - 54, 8, 2, P.brassHi);
  px(ctx, 129, FLOOR_Y - 58, 6, 2, P.lampGlow);
}

/** Simple orange ginger cat NPC near the desk. */
function drawCat(ctx: CanvasRenderingContext2D, time: number): void {
  const bob = Math.floor(time * 2) % 2;
  const x = 58;
  const y = FLOOR_Y - 10 + bob;
  // Body
  px(ctx, x, y - 10, 14, 8, '#e07828');
  px(ctx, x + 1, y - 9, 12, 2, '#f09848');
  px(ctx, x + 2, y - 6, 10, 3, '#c06020');
  // Head
  px(ctx, x + 10, y - 16, 8, 7, '#e07828');
  px(ctx, x + 11, y - 15, 6, 2, '#f09848');
  // Ears
  px(ctx, x + 10, y - 19, 3, 3, '#e07828');
  px(ctx, x + 15, y - 19, 3, 3, '#e07828');
  px(ctx, x + 11, y - 18, 1, 1, '#f8b070');
  px(ctx, x + 16, y - 18, 1, 1, '#f8b070');
  // Eyes + nose
  px(ctx, x + 12, y - 14, 1, 1, '#203020');
  px(ctx, x + 15, y - 14, 1, 1, '#203020');
  px(ctx, x + 13, y - 12, 2, 1, '#d04040');
  // Tail
  px(ctx, x - 4, y - 12, 5, 2, '#e07828');
  px(ctx, x - 5, y - 16, 2, 5, '#c06020');
  // Stripes
  px(ctx, x + 4, y - 8, 2, 1, '#a04818');
  px(ctx, x + 8, y - 7, 2, 1, '#a04818');
}

function drawHotspotHints(
  ctx: CanvasRenderingContext2D,
  states: StateManager,
  beerCans: BeerCan[],
): void {
  const pulse = Math.floor(performance.now() / 380) % 2 === 0;
  if (!pulse || !states.flags.introDone) return;

  if (!states.flags.diaryUnlocked) {
    px(ctx, 270, FLOOR_Y - 42, 3, 3, P.brassHi);
  } else {
    px(ctx, 270, FLOOR_Y - 58, 3, 3, '#70d0ff');
  }
  for (const c of beerCans) {
    if (!c.taken) px(ctx, c.x - 1, FLOOR_Y - 20, 2, 2, '#f0d878');
  }
}

function drawPromptBar(ctx: CanvasRenderingContext2D, width: number, text: string): void {
  const tw = measureNesText(text, 1, 1);
  const bw = Math.min(width - 8, tw + 18);
  segaBox(ctx, Math.round((width - bw) / 2), PROMPT_Y - 12, bw, 16, P.uiBox, P.uiBorder, {
    borderDark: P.uiBorderDark,
  });
  drawNesTextCentered(ctx, text, width / 2, PROMPT_Y - 6, P.uiText, 1, 1);
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
  drawNesTextCentered(ctx, 'ГОД 1995, МЫ СЧАСТЛИВЫ', width / 2, by + bh - 14, '#3a2a18', 1, 1);
  drawNesTextCentered(ctx, 'E / ENTER - ДАЛЬШЕ', width / 2, height - 16, P.uiText, 1, 1);
}

function drawToast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
): void {
  const label = text.toUpperCase();
  const tw = measureNesText(label, 1, 1);
  const bw = Math.min(width - 24, tw + 24);
  const bx = Math.round((width - bw) / 2);
  const by = Math.round(height / 2 - 14);
  segaBox(ctx, bx, by, bw, 28, P.uiBox, P.uiBorder, { borderDark: P.uiBorderDark });
  drawNesTextCentered(ctx, label, width / 2, by + 11, P.uiText, 1, 1);
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

  drawNesTextCentered(ctx, 'ДНЕВНИК - УРОВНИ', width / 2, by + 14, P.diaryPages, 1, 1);
  px(ctx, bx + 16, by + 28, bw - 32, 1, '#8a6a48');

  const levels = [
    {
      title: 'УР. 1 - НОВГОРОД РЫНОК',
      sub: progress.level1Cleared ? 'ПРОЙДЕН - ПОВТОР' : 'ЗИМА 1995',
      locked: false,
    },
    {
      title: progress.level1Cleared ? 'УР. 2 - ПОДЪЕЗД №7' : 'УР. 2 - ???',
      sub: !progress.level1Cleared
        ? 'ЗАКРЫТ - ПРОЙДИ УР. 1'
        : progress.level2Cleared
          ? 'ПРОЙДЕН - ПОВТОР'
          : 'ЗИМА 1995',
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
    drawNesText(ctx, `${selected ? '>' : ' '} ${lvl.title}`, bx + 16, ly, titleColor, 1, 1);
    drawNesText(ctx, lvl.sub, bx + 28, ly + 12, lvl.locked ? '#5a4a40' : '#a09080', 1, 1);
  });

  const hint =
    cursor === 1 && progress.level1Cleared
      ? 'ENTER / E - НАЧАТЬ УР. 2'
      : 'ENTER / E - НАЧАТЬ УР. 1';
  drawNesTextCentered(ctx, hint, width / 2, by + bh - 16, P.uiText, 1, 1);
}
