/**
 * ERA_2026 framing apartment — NES tiled Khrushchyovka.
 * Flow unchanged: key → photo → diary → Level Select → fade to rynok.
 */

import type { StateManager } from '@/core/StateManager';
import type { Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import { APT_PAL } from '@/art/nesPalette';
import { fillPattern, nesBox, px } from '@/art/pixelDraw';
import { drawNesText, drawNesTextCentered, measureNesText } from '@/art/nesFont';

const WIDTH = 320;
const FLOOR_Y = 152;
const PROMPT_Y = 168;
const P = APT_PAL;

interface Hotspot {
  id: 'key' | 'photo' | 'diary';
  x: number;
  w: number;
  label: string;
}

const HOTSPOTS: readonly Hotspot[] = [
  { id: 'key', x: 235, w: 70, label: 'E - SEARCH DRAWER' },
  { id: 'photo', x: 140, w: 50, label: 'E - INSPECT PHOTO' },
  { id: 'diary', x: 40, w: 50, label: 'E - OPEN DIARY' },
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
        fortitude: 100,
        paused: false,
      });
      refreshObjective();
    },

    exit(): void {
      overlay = 'none';
    },

    update(dt: number): void {
      player.update(dt);

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
      drawApartment(ctx, width, height, states.flags.hasKey, states.flags.diaryUnlocked);
      player.render(ctx, alpha);
      drawHotspotHints(ctx, states);

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
): void {
  // Night room wash
  px(ctx, 0, 0, width, height, P.wallDark);

  // Wallpapered back wall
  fillPattern(ctx, 0, 0, width, FLOOR_Y - 8, P.wallBase, P.wallpaperDot, 10, 'dots');
  // Subtle vertical seam lines (panel feel)
  ctx.fillStyle = P.wallpaper;
  for (let x = 40; x < width; x += 48) {
    ctx.fillRect(x, 8, 1, FLOOR_Y - 20);
  }

  drawWindow(ctx);
  drawFloor(ctx, width, height);
  drawBed(ctx);
  drawDeskAndDiary(ctx, diaryUnlocked);
  drawWallPhoto(ctx);
  drawDresser(ctx, hasKey);
  drawPlant(ctx);
  drawBaseboard(ctx, width);

  // Soft lamp glow (pixel dither, no alpha wash)
  ctx.fillStyle = P.lampGlow;
  const glowDots = [
    [90, 70],
    [100, 78],
    [110, 68],
    [120, 82],
    [95, 90],
    [130, 74],
    [140, 88],
    [105, 100],
  ] as const;
  for (const [gx, gy] of glowDots) {
    ctx.fillRect(gx, gy, 1, 1);
  }
}

function drawWindow(ctx: CanvasRenderingContext2D): void {
  // Outer frame
  px(ctx, 206, 24, 80, 60, P.wood);
  px(ctx, 208, 26, 76, 56, P.woodDark);
  // Night glass
  px(ctx, 212, 30, 68, 48, P.nightSky);
  // City skyline tiles
  px(ctx, 216, 50, 12, 28, P.city);
  px(ctx, 230, 42, 16, 36, P.cityMid);
  px(ctx, 248, 54, 10, 24, P.city);
  px(ctx, 260, 46, 14, 32, P.cityMid);
  // Windows in buildings
  const lights = [
    [218, 54],
    [222, 62],
    [234, 48],
    [240, 58],
    [252, 58],
    [264, 52],
    [268, 64],
  ] as const;
  for (const [lx, ly] of lights) {
    px(ctx, lx, ly, 2, 2, P.windowLight);
  }
  // Mullion
  px(ctx, 244, 30, 2, 48, P.woodLight);
  px(ctx, 212, 52, 68, 2, P.woodLight);
  // Curtains (left + right panels with folds)
  px(ctx, 210, 28, 10, 52, P.curtain);
  px(ctx, 212, 32, 2, 44, P.curtainLight);
  px(ctx, 216, 36, 2, 40, P.curtainLight);
  px(ctx, 274, 28, 10, 52, P.curtain);
  px(ctx, 276, 32, 2, 44, P.curtainLight);
  px(ctx, 280, 36, 2, 40, P.curtainLight);
  // Curtain rod
  px(ctx, 208, 26, 76, 2, P.woodLight);
}

function drawFloor(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  px(ctx, 0, FLOOR_Y - 8, width, height - (FLOOR_Y - 8), P.floor);
  // Board planks
  for (let x = 0; x < width; x += 16) {
    px(ctx, x, FLOOR_Y - 8, 15, height - (FLOOR_Y - 8), x % 32 === 0 ? P.floorLight : P.floor);
    px(ctx, x + 15, FLOOR_Y - 8, 1, height - (FLOOR_Y - 8), P.floorDark);
  }
  // Nail dots
  ctx.fillStyle = P.floorDark;
  for (let x = 6; x < width; x += 16) {
    ctx.fillRect(x, FLOOR_Y + 4, 1, 1);
    ctx.fillRect(x, FLOOR_Y + 14, 1, 1);
  }
}

function drawBaseboard(ctx: CanvasRenderingContext2D, width: number): void {
  px(ctx, 0, FLOOR_Y - 10, width, 2, P.woodDark);
  px(ctx, 0, FLOOR_Y - 11, width, 1, P.wood);
}

function drawBed(ctx: CanvasRenderingContext2D): void {
  // Frame
  px(ctx, 10, FLOOR_Y - 20, 60, 12, P.woodDark);
  px(ctx, 10, FLOOR_Y - 8, 60, 4, P.wood);
  // Legs
  px(ctx, 12, FLOOR_Y - 8, 3, 8, P.woodDark);
  px(ctx, 65, FLOOR_Y - 8, 3, 8, P.woodDark);
  // Mattress / sheet tiles
  px(ctx, 12, FLOOR_Y - 24, 56, 6, P.bedSheet);
  for (let x = 14; x < 66; x += 6) {
    px(ctx, x, FLOOR_Y - 23, 1, 4, P.wallpaper);
  }
  // Blanket folded
  px(ctx, 28, FLOOR_Y - 26, 38, 8, P.bedBlanket);
  px(ctx, 30, FLOOR_Y - 25, 34, 2, '#a85868');
  px(ctx, 28, FLOOR_Y - 20, 38, 1, '#6a3040');
  // Pillow with case detail
  px(ctx, 12, FLOOR_Y - 30, 18, 8, P.pillow);
  px(ctx, 14, FLOOR_Y - 28, 14, 4, '#e8e0e8');
  px(ctx, 12, FLOOR_Y - 30, 18, 1, P.wood);
  // Headboard
  px(ctx, 10, FLOOR_Y - 36, 4, 18, P.wood);
  px(ctx, 11, FLOOR_Y - 34, 2, 4, P.woodLight);
}

function drawDeskAndDiary(ctx: CanvasRenderingContext2D, diaryUnlocked: boolean): void {
  // Desk body
  px(ctx, 46, FLOOR_Y - 34, 48, 26, P.wood);
  px(ctx, 48, FLOOR_Y - 32, 44, 2, P.woodLight);
  // Drawer lines
  px(ctx, 50, FLOOR_Y - 22, 40, 1, P.woodDark);
  px(ctx, 50, FLOOR_Y - 12, 40, 1, P.woodDark);
  px(ctx, 66, FLOOR_Y - 20, 6, 2, P.brass);
  px(ctx, 66, FLOOR_Y - 10, 6, 2, P.brass);
  // Legs
  px(ctx, 48, FLOOR_Y - 8, 4, 8, P.woodDark);
  px(ctx, 86, FLOOR_Y - 8, 4, 8, P.woodDark);

  // Diary book on desk
  if (diaryUnlocked) {
    px(ctx, 56, FLOOR_Y - 46, 16, 12, P.diaryOpen);
    px(ctx, 56, FLOOR_Y - 46, 3, 12, P.brass);
    px(ctx, 60, FLOOR_Y - 44, 10, 8, P.diaryPages);
    // Writing lines
    px(ctx, 62, FLOOR_Y - 42, 6, 1, P.woodDark);
    px(ctx, 62, FLOOR_Y - 40, 8, 1, P.woodDark);
    px(ctx, 62, FLOOR_Y - 38, 5, 1, P.woodDark);
  } else {
    px(ctx, 56, FLOOR_Y - 46, 16, 12, P.diaryLocked);
    px(ctx, 56, FLOOR_Y - 46, 2, 12, '#4a4048');
    // Lock
    px(ctx, 66, FLOOR_Y - 42, 4, 5, '#888888');
    px(ctx, 67, FLOOR_Y - 44, 2, 2, P.brassDim);
  }
}

function drawWallPhoto(ctx: CanvasRenderingContext2D): void {
  // Frame
  px(ctx, 152, 36, 36, 30, P.frame);
  px(ctx, 154, 38, 32, 26, P.frameInner);
  // Photo content — tiny rynok scene
  px(ctx, 156, 40, 28, 22, P.photoSky);
  // Snow ground in photo
  px(ctx, 156, 54, 28, 8, P.photoSnow);
  // Stalls
  px(ctx, 158, 50, 6, 10, P.photoStall);
  px(ctx, 166, 46, 8, 14, '#5a4838');
  px(ctx, 176, 52, 5, 8, P.photoStall);
  // Awning stripes
  px(ctx, 158, 48, 6, 2, '#a04040');
  px(ctx, 166, 44, 8, 2, '#a04040');
  // Tiny figure
  px(ctx, 172, 52, 2, 4, '#3a4858');
  px(ctx, 172, 51, 2, 1, '#e8c898');
  // Snowflakes in photo
  px(ctx, 160, 42, 1, 1, P.photoSnow);
  px(ctx, 170, 43, 1, 1, P.photoSnow);
  px(ctx, 178, 41, 1, 1, P.photoSnow);
  // Caption strip
  px(ctx, 156, 58, 28, 4, '#b0a080');
  px(ctx, 158, 59, 2, 1, P.woodDark);
  px(ctx, 162, 59, 2, 1, P.woodDark);
  px(ctx, 166, 59, 4, 1, P.woodDark);
}

function drawDresser(ctx: CanvasRenderingContext2D, hasKey: boolean): void {
  px(ctx, 248, FLOOR_Y - 44, 52, 36, P.wood);
  px(ctx, 250, FLOOR_Y - 42, 48, 2, P.woodLight);
  // Three drawers
  const rows = [FLOOR_Y - 36, FLOOR_Y - 26, FLOOR_Y - 16];
  for (const ry of rows) {
    px(ctx, 252, ry, 44, 8, P.woodDark);
    px(ctx, 254, ry + 1, 40, 6, P.wood);
    px(ctx, 268, ry + 3, 10, 2, hasKey && ry === rows[0] ? '#555' : P.brass);
  }
  // Top edge detail / varnish
  px(ctx, 248, FLOOR_Y - 44, 52, 1, P.woodLight);
  // Side shadow
  px(ctx, 298, FLOOR_Y - 44, 2, 36, P.woodDark);
}

function drawPlant(ctx: CanvasRenderingContext2D): void {
  px(ctx, 118, FLOOR_Y - 10, 12, 10, P.plantPot);
  px(ctx, 120, FLOOR_Y - 8, 8, 2, P.woodDark);
  // Leaves
  px(ctx, 120, FLOOR_Y - 22, 8, 12, P.plant);
  px(ctx, 116, FLOOR_Y - 18, 6, 6, '#4a7a4a');
  px(ctx, 126, FLOOR_Y - 20, 6, 8, '#2a5a2a');
  px(ctx, 122, FLOOR_Y - 26, 4, 4, '#4a7a4a');
}

function drawHotspotHints(ctx: CanvasRenderingContext2D, states: StateManager): void {
  const pulse = Math.floor(performance.now() / 400) % 2 === 0;
  if (!pulse) return;

  if (!states.flags.hasKey) {
    px(ctx, 272, FLOOR_Y - 34, 2, 2, P.brass);
  }
  if (!states.flags.seenPhoto) {
    px(ctx, 168, 32, 2, 2, P.diaryPages);
  }
  if (states.flags.diaryUnlocked) {
    px(ctx, 62, FLOOR_Y - 50, 2, 2, '#6ec6ff');
  }
}

function drawPromptBar(ctx: CanvasRenderingContext2D, width: number, text: string): void {
  const tw = measureNesText(text, 1, 1);
  const bw = Math.min(width - 8, tw + 16);
  nesBox(ctx, Math.round((width - bw) / 2), PROMPT_Y - 10, bw, 14, P.uiBox, P.uiBorder);
  drawNesTextCentered(ctx, text, width / 2, PROMPT_Y - 5, P.uiText, 1, 1);
}

function drawPhotoOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(8, 8, 12, 0.85)';
  ctx.fillRect(0, 0, width, height);

  const bx = 60;
  const by = 22;
  const bw = 200;
  const bh = 110;
  nesBox(ctx, bx - 4, by - 4, bw + 8, bh + 8, P.frame, P.woodDark, false);
  px(ctx, bx, by, bw, bh, P.photoSky);

  // Detailed sepia rynok in overlay
  px(ctx, bx, by + 70, bw, 40, P.photoSnow);
  // Brick back wall
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 12; col++) {
      const ox = (row % 2) * 4;
      px(ctx, bx + 8 + col * 16 + ox, by + 48 + row * 6, 14, 5, row % 2 ? '#7a5840' : '#8a6850');
    }
  }
  // Stalls
  drawMiniStall(ctx, bx + 24, by + 90, '#a04040');
  drawMiniStall(ctx, bx + 80, by + 90, '#4060a0');
  drawMiniStall(ctx, bx + 136, by + 90, '#a06840');
  // Snowflakes
  for (let i = 0; i < 12; i++) {
    px(ctx, bx + 16 + (i * 17) % 180, by + 12 + (i * 9) % 40, 1, 1, P.photoSnow);
  }
  // Caption
  px(ctx, bx, by + bh - 16, bw, 16, '#b09870');
  drawNesTextCentered(ctx, 'NOVGOROD - WINTER 1995', width / 2, by + bh - 11, '#3a2a18', 1, 1);

  drawNesTextCentered(ctx, 'E / ENTER - CLOSE', width / 2, height - 14, P.uiText, 1, 1);
}

function drawMiniStall(ctx: CanvasRenderingContext2D, x: number, floorY: number, awning: string): void {
  px(ctx, x, floorY - 28, 40, 6, awning);
  px(ctx, x + 2, floorY - 24, 3, 24, P.woodDark);
  px(ctx, x + 35, floorY - 24, 3, 24, P.woodDark);
  px(ctx, x + 2, floorY - 12, 36, 8, P.wood);
  px(ctx, x + 8, floorY - 16, 6, 4, P.brass);
  px(ctx, x + 18, floorY - 15, 8, 3, P.plant);
  px(ctx, x + 28, floorY - 16, 6, 4, '#a07050');
}

function drawToast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
): void {
  const label = text.toUpperCase();
  const tw = measureNesText(label, 1, 1);
  const bw = Math.min(width - 24, tw + 20);
  const bx = Math.round((width - bw) / 2);
  const by = Math.round(height / 2 - 12);
  nesBox(ctx, bx, by, bw, 24, P.uiBox, P.uiBorder);
  drawNesTextCentered(ctx, label, width / 2, by + 9, P.uiText, 1, 1);
}

function drawDiarySelect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cursor: number,
): void {
  ctx.fillStyle = 'rgba(8, 6, 10, 0.88)';
  ctx.fillRect(0, 0, width, height);

  const bx = 36;
  const by = 20;
  const bw = width - 72;
  const bh = 128;
  nesBox(ctx, bx, by, bw, bh, '#2a1810', P.brass, true);
  px(ctx, bx + 4, by + 4, bw - 8, bh - 8, '#5a3a20');

  drawNesTextCentered(ctx, 'DIARY - LEVEL SELECT', width / 2, by + 12, P.diaryPages, 1, 1);
  px(ctx, bx + 16, by + 24, bw - 32, 1, '#8a6a48');

  const levels = [
    { title: 'LEVEL 1 - NOVGOROD RYNOK', sub: 'WINTER 1995', locked: false },
    { title: 'LEVEL 2 - ???', sub: 'LOCKED', locked: true },
  ];

  levels.forEach((lvl, i) => {
    const ly = by + 40 + i * 32;
    const selected = !lvl.locked && i === cursor;
    if (selected) {
      nesBox(ctx, bx + 12, ly - 6, bw - 24, 26, '#3a2818', P.brass, false);
    }
    const titleColor = lvl.locked ? '#6a5a50' : selected ? P.brass : P.diaryPages;
    drawNesText(ctx, `${selected ? '>' : ' '} ${lvl.title}`, bx + 16, ly, titleColor, 1, 1);
    drawNesText(ctx, lvl.sub, bx + 28, ly + 10, lvl.locked ? '#5a4a40' : '#a09080', 1, 1);
  });

  drawNesTextCentered(ctx, 'ENTER / E - BEGIN LEVEL 1', width / 2, by + bh - 14, P.uiText, 1, 1);
}
