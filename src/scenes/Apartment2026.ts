/**
 * ERA_2026 framing apartment — Genesis tiled Khrushchyovka.
 * Flow unchanged: key → photo → diary → Level Select → fade to rynok.
 */

import type { StateManager } from '@/core/StateManager';
import type { Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import { APT_PAL } from '@/art/segaPalette';
import { ditherRect, fillPattern, px, segaBox } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';
import { ParallaxStack } from '@/render/ParallaxLayer';
import { applyLightingOverlay } from '@/render/LightingOverlay';

const WIDTH = 320;
const FLOOR_Y = 192;
const PROMPT_Y = 210;
const P = APT_PAL;

interface Hotspot {
  id: 'key' | 'photo' | 'diary';
  x: number;
  w: number;
  label: string;
}

const HOTSPOTS: readonly Hotspot[] = [
  { id: 'key', x: 230, w: 75, label: 'E - SEARCH DRAWER' },
  { id: 'photo', x: 138, w: 52, label: 'E - INSPECT PHOTO' },
  { id: 'diary', x: 38, w: 52, label: 'E - OPEN DIARY' },
];

export type OverlayMode = 'none' | 'photo' | 'toast' | 'diary';

export interface ApartmentSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
}

export function createApartment2026Scene(deps: ApartmentSceneDeps) {
  const { states, player, hud } = deps;

  let overlay: OverlayMode = 'none';
  let toast = '';
  let toastTimer = 0;
  let diaryCursor = 0;
  let prompt = 'EXPLORE THE APARTMENT';
  let time = 0;
  /** Subtle camera parallax from player X (apartment is mostly static depth). */
  let depthCam = 0;
  const stack = new ParallaxStack();

  const showToast = (msg: string, seconds = 1.6): void => {
    toast = msg;
    toastTimer = seconds;
    overlay = 'toast';
  };

  const maybeUnlockDiary = (): void => {
    if (states.flags.hasKey && states.flags.seenPhoto && !states.flags.diaryUnlocked) {
      states.setFlag('diaryUnlocked', true);
      showToast('The diary unlocks.');
      refreshObjective();
    }
  };

  const refreshObjective = (): void => {
    if (!states.flags.hasKey) {
      prompt = 'FIND SOMETHING FORGOTTEN';
      hud.set({ objective: 'Search the room' });
    } else if (!states.flags.seenPhoto) {
      prompt = 'THAT PHOTO ON THE WALL';
      hud.set({ objective: 'Inspect the photo' });
    } else if (!states.flags.diaryUnlocked) {
      prompt = 'THE DIARY ANSWERS THE KEY';
      hud.set({ objective: 'Unlock the Diary' });
    } else {
      prompt = 'OPEN THE DIARY - LEVEL SELECT';
      hud.set({ objective: 'Open Diary - Level 1' });
    }
  };

  const near = (id: Hotspot['id']): boolean => {
    const h = HOTSPOTS.find((s) => s.id === id);
    if (!h) return false;
    return player.x >= h.x && player.x <= h.x + h.w;
  };

  const activePrompt = (): string | null => {
    if (overlay !== 'none') return null;
    if (near('key') && !states.flags.hasKey) return HOTSPOTS[0]!.label;
    if (near('photo') && !states.flags.seenPhoto) return HOTSPOTS[1]!.label;
    if (near('photo') && states.flags.seenPhoto) return 'PHOTO - ALREADY SEEN';
    if (near('diary') && states.flags.diaryUnlocked) return HOTSPOTS[2]!.label;
    if (near('diary') && !states.flags.diaryUnlocked) {
      if (!states.flags.hasKey) return 'DIARY - LOCKED';
      if (!states.flags.seenPhoto) return 'DIARY - LOOK AT PHOTO FIRST';
    }
    if (near('key') && states.flags.hasKey) return 'EMPTY DRAWER';
    return null;
  };

  const tryInteract = (): void => {
    const input = states.input;
    if (!input) return;
    if (!input.justPressed('interact') && !input.justPressed('confirm')) return;
    if (player.inspecting) return;

    if (overlay === 'photo') {
      overlay = 'none';
      refreshObjective();
      return;
    }
    if (overlay === 'toast') {
      overlay = 'none';
      toastTimer = 0;
      return;
    }
    if (overlay === 'diary') {
      return;
    }

    if (near('key') && !states.flags.hasKey) {
      player.beginInspect(0.5);
      states.setFlag('hasKey', true);
      showToast('Found a brass key.');
      refreshObjective();
      return;
    }

    if (near('photo') && !states.flags.seenPhoto) {
      player.beginInspect(0.55);
      states.setFlag('seenPhoto', true);
      overlay = 'photo';
      refreshObjective();
      return;
    }

    if (near('diary') && states.flags.diaryUnlocked) {
      player.beginInspect(0.35);
      overlay = 'diary';
      diaryCursor = 0;
      hud.set({ objective: 'Choose a memory' });
      return;
    }

    if (near('diary') && !states.flags.diaryUnlocked) {
      showToast(
        !states.flags.hasKey
          ? 'The diary is locked.'
          : 'Something about that photo…',
      );
    }
  };

  const updateDiarySelect = (dt: number): void => {
    void dt;
    const input = states.input;
    if (!input) return;

    if (input.justPressed('up') || input.justPressed('left')) {
      diaryCursor = 0;
    }
    if (input.justPressed('down') || input.justPressed('right')) {
      diaryCursor = 0;
    }

    if (input.justPressed('confirm') || input.justPressed('interact')) {
      states.setFlag('level1Selected', true);
      overlay = 'none';
      states.goto('rynok_1995', { era: 'ERA_1995', data: { level: 1 }, fadeSeconds: 0.55 });
    }
  };

  return {
    enter(): void {
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: 100, swagger: 0 });
      player.setFloorY(FLOOR_Y);
      player.x = 100;
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 52;
      overlay = 'none';
      toast = '';
      toastTimer = 0;
      diaryCursor = 0;
      hud.set({
        hp: player.hp,
        maxHp: 100,
        eraLabel: 'ADULT · 2026',
        fortitude: player.mentalFortitude,
        swagger: 0,
        showSwagger: false,
        paused: false,
      });
      refreshObjective();
    },

    exit(): void {
      overlay = 'none';
    },

    update(dt: number): void {
      time += dt;
      player.update(dt);
      // Soft parallax bias from walk position (room stays framed)
      depthCam += ((player.x - WIDTH / 2) * 0.08 - depthCam) * Math.min(1, dt * 4);

      if (overlay === 'diary') {
        updateDiarySelect(dt);
        return;
      }

      if (overlay === 'photo') {
        tryInteract();
        return;
      }

      if (overlay === 'toast') {
        toastTimer -= dt;
        if (toastTimer <= 0) overlay = 'none';
        const axisToast = states.input?.axisX() ?? 0;
        player.applyWalk(axisToast, dt, 28, WIDTH - 28);
        tryInteract();
        maybeUnlockDiary();
        return;
      }

      const axis = states.input?.axisX() ?? 0;
      player.applyWalk(axis, dt, 28, WIDTH - 28);
      tryInteract();
      maybeUnlockDiary();
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
          draw: (c) =>
            drawApartment(c, width, height, states.flags.hasKey, states.flags.diaryUnlocked, depthCam),
        },
        {
          id: 'gameplay',
          speedRatio: 0,
          zIndex: 10,
          screenSpace: true,
          draw: (c) => {
            player.render(c, alpha);
            drawHotspotHints(c, states);
          },
        },
        {
          id: 'lighting',
          speedRatio: 0,
          zIndex: 20,
          screenSpace: true,
          draw: (c, _s, _cam, w, h) => {
            applyLightingOverlay(c, 0, w, h, {
              // Softer multiply — warm lamp / walls readable, still night
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
            });
          },
        },
      ]);
      stack.render(ctx, depthCam, width, height);

      const p = activePrompt() ?? (overlay === 'none' ? prompt : null);
      if (p && overlay === 'none') {
        drawPromptBar(ctx, width, p);
      }

      if (overlay === 'photo') drawPhotoOverlay(ctx, width, height);
      if (overlay === 'toast') drawToast(ctx, width, height, toast);
      if (overlay === 'diary') drawDiarySelect(ctx, width, height, diaryCursor);
    },
  };
}

function drawApartment(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hasKey: boolean,
  diaryUnlocked: boolean,
  depthCam = 0,
): void {
  px(ctx, 0, 0, width, height, P.wallDeep);

  // Wallpaper with diamond motif + panel seams
  fillPattern(ctx, 0, 0, width, FLOOR_Y - 10, P.wallBase, P.wallpaperMotif, 14, 'diamonds');
  // Soft vertical panels
  for (let x = 36; x < width; x += 52) {
    px(ctx, x, 10, 2, FLOOR_Y - 24, P.wallpaperShadow);
    px(ctx, x + 1, 10, 1, FLOOR_Y - 24, P.wallpaper);
  }
  // Ceiling shadow band
  ditherRect(ctx, 0, 0, width, 10, P.wallDeep, P.wallDark);

  drawWindow(ctx, depthCam);
  drawFloor(ctx, width, height);
  drawBed(ctx);
  drawDeskAndDiary(ctx, diaryUnlocked);
  drawWallPhoto(ctx);
  drawDresser(ctx, hasKey);
  drawPlant(ctx);
  drawLamp(ctx);
  drawBaseboard(ctx, width);

  // Warm lamp dither glow seeds (lighting overlay adds multiply/screen wash)
  ctx.fillStyle = P.lampGlow;
  const glowDots = [
    [88, 78], [96, 86], [104, 74], [112, 92], [120, 80],
    [128, 98], [136, 84], [100, 108], [116, 100], [140, 94],
    [92, 96], [108, 88], [124, 110], [132, 76],
  ] as const;
  for (const [gx, gy] of glowDots) {
    ctx.fillRect(gx, gy, 1, 1);
  }
  ctx.fillStyle = P.lampGlowDim;
  for (const [gx, gy] of glowDots) {
    if ((gx + gy) % 3 === 0) ctx.fillRect(gx + 1, gy + 1, 1, 1);
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, depthCam = 0): void {
  // Outer wood frame with bevel
  px(ctx, 200, 28, 92, 72, P.woodDark);
  px(ctx, 202, 30, 88, 68, P.wood);
  px(ctx, 204, 32, 84, 2, P.woodHi);
  px(ctx, 204, 32, 2, 64, P.woodHi);
  px(ctx, 204, 34, 80, 60, P.woodDeep);

  // Night glass + gradient sky
  px(ctx, 208, 38, 72, 52, P.nightSky);
  ditherRect(ctx, 208, 38, 72, 8, P.nightSky, P.nightSkyMid);
  px(ctx, 208, 70, 72, 20, P.nightSkyMid);

  // City skyline — subtle parallax vs room (depthCam)
  const ox = Math.round(depthCam * 0.35);
  px(ctx, 212 + ox, 62, 14, 28, P.city);
  px(ctx, 214 + ox, 58, 10, 4, P.cityMid);
  px(ctx, 228 + ox, 50, 18, 40, P.cityMid);
  px(ctx, 230 + ox, 46, 14, 4, P.cityHi);
  px(ctx, 248 + ox, 66, 12, 24, P.city);
  px(ctx, 262 + ox, 54, 14, 36, P.cityMid);
  px(ctx, 264 + ox, 50, 10, 4, P.cityHi);
  // Distant Kremlin hint through glass
  px(ctx, 240 + Math.round(depthCam * 0.15), 48, 8, 20, '#0a1018');
  px(ctx, 242 + Math.round(depthCam * 0.15), 42, 4, 8, '#121820');

  const lights = [
    [216, 66], [220, 74], [232, 56], [238, 66], [242, 76],
    [252, 72], [266, 60], [270, 72], [274, 80],
  ] as const;
  for (const [lx, ly] of lights) {
    px(ctx, lx + ox, ly, 2, 2, P.windowLight);
    px(ctx, lx + ox, ly, 2, 1, P.windowLightDim);
  }

  // Mullion
  px(ctx, 242, 38, 3, 52, P.woodMid);
  px(ctx, 243, 38, 1, 52, P.woodHi);
  px(ctx, 208, 62, 72, 3, P.woodMid);
  px(ctx, 208, 63, 72, 1, P.woodHi);

  // Curtains — left / right with folds
  px(ctx, 206, 36, 14, 58, P.curtain);
  px(ctx, 208, 40, 3, 50, P.curtainHi);
  px(ctx, 212, 44, 3, 46, P.curtainFold);
  px(ctx, 216, 48, 2, 40, P.curtainDark);
  px(ctx, 278, 36, 14, 58, P.curtain);
  px(ctx, 280, 40, 3, 50, P.curtainHi);
  px(ctx, 284, 44, 3, 46, P.curtainFold);
  px(ctx, 288, 48, 2, 40, P.curtainDark);
  // Rod
  px(ctx, 204, 34, 84, 3, P.woodHi);
  px(ctx, 204, 36, 84, 1, P.woodDark);
}

function drawFloor(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  px(ctx, 0, FLOOR_Y - 10, width, height - (FLOOR_Y - 10), P.floor);
  for (let x = 0; x < width; x += 18) {
    const light = x % 36 === 0;
    px(ctx, x, FLOOR_Y - 10, 17, height - (FLOOR_Y - 10), light ? P.floorLight : P.floorMid);
    px(ctx, x + 17, FLOOR_Y - 10, 1, height - (FLOOR_Y - 10), P.floorDark);
    // Grain
    px(ctx, x + 4, FLOOR_Y + 2, 8, 1, P.floorGrain);
    px(ctx, x + 8, FLOOR_Y + 12, 6, 1, P.floorDark);
  }
  ctx.fillStyle = P.floorDark;
  for (let x = 8; x < width; x += 18) {
    ctx.fillRect(x, FLOOR_Y + 6, 1, 1);
    ctx.fillRect(x + 2, FLOOR_Y + 18, 1, 1);
  }
}

function drawBaseboard(ctx: CanvasRenderingContext2D, width: number): void {
  px(ctx, 0, FLOOR_Y - 12, width, 2, P.woodDark);
  px(ctx, 0, FLOOR_Y - 14, width, 2, P.wood);
  px(ctx, 0, FLOOR_Y - 14, width, 1, P.woodHi);
}

function drawBed(ctx: CanvasRenderingContext2D): void {
  // Frame + legs
  px(ctx, 8, FLOOR_Y - 24, 68, 14, P.woodDark);
  px(ctx, 10, FLOOR_Y - 22, 64, 2, P.woodHi);
  px(ctx, 8, FLOOR_Y - 10, 68, 6, P.wood);
  px(ctx, 10, FLOOR_Y - 10, 3, 10, P.woodDeep);
  px(ctx, 70, FLOOR_Y - 10, 3, 10, P.woodDeep);

  // Mattress / sheet
  px(ctx, 12, FLOOR_Y - 30, 60, 8, P.bedSheet);
  px(ctx, 14, FLOOR_Y - 28, 56, 2, P.bedSheetHi);
  for (let x = 16; x < 70; x += 7) {
    px(ctx, x, FLOOR_Y - 27, 1, 4, P.wallpaper);
  }

  // Folded blanket with bevel
  px(ctx, 30, FLOOR_Y - 34, 42, 10, P.bedBlanket);
  px(ctx, 32, FLOOR_Y - 32, 38, 2, P.bedBlanketHi);
  px(ctx, 30, FLOOR_Y - 26, 42, 2, P.bedBlanketDark);
  px(ctx, 48, FLOOR_Y - 30, 8, 1, P.bedBlanketDark);

  // Pillow
  px(ctx, 12, FLOOR_Y - 38, 20, 10, P.pillow);
  px(ctx, 14, FLOOR_Y - 36, 16, 3, P.pillowHi);
  px(ctx, 12, FLOOR_Y - 30, 20, 2, P.pillowShadow);
  px(ctx, 12, FLOOR_Y - 38, 20, 1, P.wood);

  // Headboard carved detail
  px(ctx, 8, FLOOR_Y - 46, 6, 24, P.wood);
  px(ctx, 9, FLOOR_Y - 44, 4, 2, P.woodHi);
  px(ctx, 10, FLOOR_Y - 40, 2, 6, P.woodMid);
  px(ctx, 9, FLOOR_Y - 32, 4, 2, P.woodHi);
}

function drawDeskAndDiary(ctx: CanvasRenderingContext2D, diaryUnlocked: boolean): void {
  // Desk body with bevels
  px(ctx, 44, FLOOR_Y - 42, 54, 32, P.wood);
  px(ctx, 46, FLOOR_Y - 40, 50, 2, P.woodHi);
  px(ctx, 46, FLOOR_Y - 40, 2, 28, P.woodHi);
  px(ctx, 94, FLOOR_Y - 40, 2, 28, P.woodDark);
  px(ctx, 46, FLOOR_Y - 12, 50, 2, P.woodDark);

  // Drawers
  px(ctx, 50, FLOOR_Y - 28, 42, 1, P.woodDark);
  px(ctx, 50, FLOOR_Y - 16, 42, 1, P.woodDark);
  px(ctx, 66, FLOOR_Y - 26, 8, 3, P.brass);
  px(ctx, 68, FLOOR_Y - 25, 4, 1, P.brassHi);
  px(ctx, 66, FLOOR_Y - 14, 8, 3, P.brass);
  px(ctx, 68, FLOOR_Y - 13, 4, 1, P.brassHi);

  // Legs
  px(ctx, 48, FLOOR_Y - 10, 5, 10, P.woodDeep);
  px(ctx, 88, FLOOR_Y - 10, 5, 10, P.woodDeep);

  // Diary
  if (diaryUnlocked) {
    px(ctx, 54, FLOOR_Y - 56, 20, 14, P.diaryOpen);
    px(ctx, 54, FLOOR_Y - 56, 4, 14, P.brass);
    px(ctx, 56, FLOOR_Y - 55, 2, 2, P.brassHi);
    px(ctx, 60, FLOOR_Y - 54, 12, 10, P.diaryPages);
    px(ctx, 62, FLOOR_Y - 52, 8, 1, P.diaryInk);
    px(ctx, 62, FLOOR_Y - 50, 10, 1, P.diaryInk);
    px(ctx, 62, FLOOR_Y - 48, 6, 1, P.diaryInk);
    px(ctx, 62, FLOOR_Y - 46, 9, 1, P.diaryInk);
  } else {
    px(ctx, 54, FLOOR_Y - 56, 20, 14, P.diaryLocked);
    px(ctx, 54, FLOOR_Y - 56, 3, 14, P.diaryLockedHi);
    px(ctx, 66, FLOOR_Y - 50, 6, 6, '#909098');
    px(ctx, 67, FLOOR_Y - 52, 4, 3, P.brassDim);
    px(ctx, 68, FLOOR_Y - 48, 2, 2, P.woodDeep);
  }
}

function drawWallPhoto(ctx: CanvasRenderingContext2D): void {
  // Ornate frame
  px(ctx, 148, 40, 42, 36, P.frameDark);
  px(ctx, 150, 42, 38, 32, P.frame);
  px(ctx, 152, 44, 34, 2, P.frameHi);
  px(ctx, 152, 44, 2, 28, P.frameHi);
  px(ctx, 152, 46, 34, 26, P.frameInner);

  // Photo — tiny rynok with more detail
  px(ctx, 154, 48, 30, 22, P.photoSky);
  ditherRect(ctx, 154, 48, 30, 4, P.photoSkyHi, P.photoSky);
  px(ctx, 154, 62, 30, 8, P.photoSnow);
  px(ctx, 156, 58, 7, 10, P.photoStall);
  px(ctx, 165, 54, 9, 14, '#5a4838');
  px(ctx, 176, 60, 6, 8, P.photoStall);
  px(ctx, 156, 56, 7, 2, '#b04848');
  px(ctx, 165, 52, 9, 2, '#b04848');
  px(ctx, 170, 60, 2, 5, '#3a4860');
  px(ctx, 170, 59, 2, 1, '#e8c898');
  px(ctx, 158, 50, 1, 1, P.photoSnow);
  px(ctx, 168, 51, 1, 1, P.photoSnow);
  px(ctx, 178, 49, 1, 1, P.photoSnow);
  px(ctx, 154, 66, 30, 4, '#b0a080');
  px(ctx, 156, 67, 3, 1, P.woodDark);
  px(ctx, 161, 67, 4, 1, P.woodDark);
  px(ctx, 167, 67, 6, 1, P.woodDark);
}

function drawDresser(ctx: CanvasRenderingContext2D, hasKey: boolean): void {
  px(ctx, 244, FLOOR_Y - 54, 58, 44, P.wood);
  px(ctx, 246, FLOOR_Y - 52, 54, 2, P.woodHi);
  px(ctx, 246, FLOOR_Y - 52, 2, 40, P.woodHi);
  px(ctx, 298, FLOOR_Y - 52, 2, 40, P.woodDark);
  px(ctx, 244, FLOOR_Y - 54, 58, 1, P.woodHi);

  const rows = [FLOOR_Y - 46, FLOOR_Y - 34, FLOOR_Y - 22];
  for (const ry of rows) {
    px(ctx, 248, ry, 50, 10, P.woodDark);
    px(ctx, 250, ry + 1, 46, 8, P.wood);
    px(ctx, 252, ry + 2, 42, 1, P.woodHi);
    const handle = hasKey && ry === rows[0] ? '#555555' : P.brass;
    px(ctx, 266, ry + 4, 12, 3, handle);
    if (handle === P.brass) px(ctx, 268, ry + 4, 8, 1, P.brassHi);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D): void {
  px(ctx, 116, FLOOR_Y - 12, 14, 12, P.plantPot);
  px(ctx, 118, FLOOR_Y - 10, 10, 2, P.plantPotHi);
  px(ctx, 118, FLOOR_Y - 4, 10, 2, P.woodDark);
  px(ctx, 118, FLOOR_Y - 28, 10, 16, P.plant);
  px(ctx, 120, FLOOR_Y - 26, 6, 2, P.plantHi);
  px(ctx, 112, FLOOR_Y - 22, 8, 8, P.plantHi);
  px(ctx, 126, FLOOR_Y - 24, 8, 10, P.plantDark);
  px(ctx, 120, FLOOR_Y - 34, 6, 6, P.plantHi);
  px(ctx, 122, FLOOR_Y - 36, 2, 2, P.plant);
}

function drawLamp(ctx: CanvasRenderingContext2D): void {
  // Desk lamp near bed / desk
  px(ctx, 98, FLOOR_Y - 48, 4, 18, P.woodDark);
  px(ctx, 94, FLOOR_Y - 56, 12, 8, P.brass);
  px(ctx, 96, FLOOR_Y - 54, 8, 2, P.brassHi);
  px(ctx, 97, FLOOR_Y - 58, 6, 2, P.lampGlow);
}

function drawHotspotHints(ctx: CanvasRenderingContext2D, states: StateManager): void {
  const pulse = Math.floor(performance.now() / 380) % 2 === 0;
  if (!pulse) return;

  if (!states.flags.hasKey) {
    px(ctx, 270, FLOOR_Y - 42, 3, 3, P.brassHi);
  }
  if (!states.flags.seenPhoto) {
    px(ctx, 166, 36, 3, 3, P.diaryPages);
  }
  if (states.flags.diaryUnlocked) {
    px(ctx, 62, FLOOR_Y - 60, 3, 3, '#70d0ff');
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
  px(ctx, bx, by, bw, bh, P.photoSky);
  ditherRect(ctx, bx, by, bw, 12, P.photoSkyHi, P.photoSky);

  px(ctx, bx, by + 80, bw, 48, P.photoSnow);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 14; col++) {
      const ox = (row % 2) * 5;
      px(
        ctx,
        bx + 6 + col * 15 + ox,
        by + 52 + row * 6,
        13,
        5,
        row % 2 ? '#7a5840' : '#8a6850',
      );
      px(ctx, bx + 6 + col * 15 + ox, by + 52 + row * 6, 13, 1, '#a88868');
    }
  }
  drawMiniStall(ctx, bx + 20, by + 108, '#b04848');
  drawMiniStall(ctx, bx + 88, by + 108, '#4060a8');
  drawMiniStall(ctx, bx + 156, by + 108, '#a06840');
  for (let i = 0; i < 16; i++) {
    px(ctx, bx + 14 + (i * 19) % 190, by + 14 + (i * 11) % 44, 1, 1, P.photoSnow);
  }
  px(ctx, bx, by + bh - 18, bw, 18, '#b09870');
  drawNesTextCentered(ctx, 'NOVGOROD - WINTER 1995', width / 2, by + bh - 12, '#3a2a18', 1, 1);
  drawNesTextCentered(ctx, 'E / ENTER - CLOSE', width / 2, height - 16, P.uiText, 1, 1);
}

function drawMiniStall(ctx: CanvasRenderingContext2D, x: number, floorY: number, awning: string): void {
  px(ctx, x, floorY - 32, 44, 8, awning);
  px(ctx, x, floorY - 32, 44, 2, '#f0ece0');
  px(ctx, x + 2, floorY - 24, 3, 24, P.woodDark);
  px(ctx, x + 39, floorY - 24, 3, 24, P.woodDark);
  px(ctx, x + 2, floorY - 14, 40, 10, P.wood);
  px(ctx, x + 4, floorY - 12, 36, 2, P.woodHi);
  px(ctx, x + 8, floorY - 18, 8, 4, P.brass);
  px(ctx, x + 20, floorY - 17, 10, 3, P.plant);
  px(ctx, x + 32, floorY - 18, 8, 4, '#a07050');
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

  drawNesTextCentered(ctx, 'DIARY - LEVEL SELECT', width / 2, by + 14, P.diaryPages, 1, 1);
  px(ctx, bx + 16, by + 28, bw - 32, 1, '#8a6a48');

  const levels = [
    { title: 'LEVEL 1 - NOVGOROD RYNOK', sub: 'WINTER 1995', locked: false },
    { title: 'LEVEL 2 - ???', sub: 'LOCKED', locked: true },
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

  drawNesTextCentered(ctx, 'ENTER / E - BEGIN LEVEL 1', width / 2, by + bh - 16, P.uiText, 1, 1);
}
