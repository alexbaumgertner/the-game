/**
 * ERA_2026 framing apartment — find key, inspect photo, unlock Diary (Level Select).
 * Procedural geometric pixel art; adult_* walk/idle/inspect.
 */

import type { StateManager } from '@/core/StateManager';
import type { Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';

const WIDTH = 320;
const FLOOR_Y = 152;
const PROMPT_Y = 168;

interface Hotspot {
  id: 'key' | 'photo' | 'diary';
  x: number;
  w: number;
  label: string;
}

const HOTSPOTS: readonly Hotspot[] = [
  { id: 'key', x: 235, w: 70, label: 'E · Search drawer' },
  { id: 'photo', x: 140, w: 50, label: 'E · Inspect photo' },
  { id: 'diary', x: 40, w: 50, label: 'E · Open Diary' },
];

export type OverlayMode = 'none' | 'photo' | 'toast' | 'diary';

export interface ApartmentSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
}

/**
 * Factory that returns SceneHandlers bound to shared deps.
 * Diary level-select is an overlay inside this scene (same register id until Level 1).
 */
export function createApartment2026Scene(deps: ApartmentSceneDeps) {
  const { states, player, hud } = deps;

  let overlay: OverlayMode = 'none';
  let toast = '';
  let toastTimer = 0;
  let diaryCursor = 0;
  let prompt = 'Explore the apartment';

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
      prompt = 'Find something forgotten…';
      hud.set({ objective: 'Search the room' });
    } else if (!states.flags.seenPhoto) {
      prompt = 'That photo on the wall…';
      hud.set({ objective: 'Inspect the vintage photo' });
    } else if (!states.flags.diaryUnlocked) {
      prompt = 'The diary answers the key';
      hud.set({ objective: 'Unlock the Diary' });
    } else {
      prompt = 'Open the Diary — Level Select';
      hud.set({ objective: 'Open Diary → Level 1' });
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
    if (near('photo') && states.flags.seenPhoto) return 'Photo — already seen';
    if (near('diary') && states.flags.diaryUnlocked) return HOTSPOTS[2]!.label;
    if (near('diary') && !states.flags.diaryUnlocked) {
      if (!states.flags.hasKey) return 'Diary — locked';
      if (!states.flags.seenPhoto) return 'Diary — look at the photo first';
    }
    if (near('key') && states.flags.hasKey) return 'Empty drawer';
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
      // Handled in update for confirm / cursor
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
      diaryCursor = 0; // only one unlocked level for now
    }

    if (input.justPressed('confirm') || input.justPressed('interact')) {
      // Level 1 selected → fade into ERA_1995 rynok
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
        // Movement stays live under a toast so the player can keep exploring.
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

      // Hotspot glints
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
  ctx.fillStyle = '#1c1a24';
  ctx.fillRect(0, 0, width, height);

  // Back wall
  ctx.fillStyle = '#2a2634';
  ctx.fillRect(0, 0, width, FLOOR_Y - 8);

  // Window — city night
  ctx.fillStyle = '#12141c';
  ctx.fillRect(210, 28, 72, 52);
  ctx.fillStyle = '#3a4258';
  ctx.fillRect(208, 26, 76, 56);
  ctx.fillStyle = '#0e1220';
  ctx.fillRect(214, 32, 64, 44);
  // City blocks / lights
  ctx.fillStyle = '#1a2030';
  ctx.fillRect(218, 48, 14, 28);
  ctx.fillRect(236, 40, 18, 36);
  ctx.fillRect(258, 52, 12, 24);
  const lights = [
    [220, 52],
    [226, 60],
    [240, 46],
    [248, 58],
    [260, 56],
  ] as const;
  ctx.fillStyle = '#e8c56a';
  for (const [lx, ly] of lights) {
    ctx.fillRect(lx, ly, 2, 2);
  }
  // Window frame mullion
  ctx.fillStyle = '#4a4658';
  ctx.fillRect(244, 32, 2, 44);
  ctx.fillRect(214, 52, 64, 2);

  // Floor
  ctx.fillStyle = '#3a3228';
  ctx.fillRect(0, FLOOR_Y - 8, width, height - (FLOOR_Y - 8));
  ctx.fillStyle = '#4a4034';
  ctx.fillRect(0, FLOOR_Y - 8, width, 2);
  // Floor boards
  ctx.fillStyle = '#322a22';
  for (let x = 0; x < width; x += 24) {
    ctx.fillRect(x, FLOOR_Y, 1, height - FLOOR_Y);
  }

  // Bed (left)
  ctx.fillStyle = '#4a3a48';
  ctx.fillRect(12, FLOOR_Y - 22, 56, 14);
  ctx.fillStyle = '#6a5a68';
  ctx.fillRect(12, FLOOR_Y - 26, 56, 6);
  ctx.fillStyle = '#8a7a88';
  ctx.fillRect(14, FLOOR_Y - 28, 18, 8);

  // Desk / diary shelf
  ctx.fillStyle = '#5a4a38';
  ctx.fillRect(48, FLOOR_Y - 36, 44, 28);
  ctx.fillStyle = '#3a2e24';
  ctx.fillRect(50, FLOOR_Y - 34, 40, 4);
  // Diary book
  ctx.fillStyle = diaryUnlocked ? '#8b4518' : '#2a2020';
  ctx.fillRect(58, FLOOR_Y - 48, 14, 12);
  ctx.fillStyle = diaryUnlocked ? '#c4a574' : '#4a4040';
  ctx.fillRect(58, FLOOR_Y - 48, 2, 12);
  if (!diaryUnlocked) {
    // Lock nub
    ctx.fillStyle = '#888';
    ctx.fillRect(68, FLOOR_Y - 44, 3, 4);
  }

  // Wall photo frame
  ctx.fillStyle = '#6a5a40';
  ctx.fillRect(156, 40, 28, 24);
  ctx.fillStyle = '#c8b898';
  ctx.fillRect(158, 42, 24, 20);
  // Tiny rynok silhouette in photo
  ctx.fillStyle = '#6a5848';
  ctx.fillRect(160, 52, 6, 8);
  ctx.fillRect(168, 48, 8, 12);
  ctx.fillRect(178, 54, 4, 6);
  ctx.fillStyle = '#a09070';
  ctx.fillRect(162, 46, 16, 4);

  // Right dresser (key drawer)
  ctx.fillStyle = '#4a3e32';
  ctx.fillRect(250, FLOOR_Y - 40, 48, 32);
  ctx.fillStyle = '#3a3228';
  ctx.fillRect(252, FLOOR_Y - 28, 44, 1);
  ctx.fillRect(252, FLOOR_Y - 16, 44, 1);
  // Drawer handle
  ctx.fillStyle = hasKey ? '#555' : '#c4a040';
  ctx.fillRect(270, FLOOR_Y - 24, 8, 2);

  // Plant
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(118, FLOOR_Y - 20, 10, 12);
  ctx.fillStyle = '#2a3a28';
  ctx.fillRect(120, FLOOR_Y - 8, 6, 8);

  // Soft lamp glow
  ctx.fillStyle = 'rgba(232, 197, 106, 0.08)';
  ctx.fillRect(80, 60, 100, 80);
}

function drawHotspotHints(
  ctx: CanvasRenderingContext2D,
  states: StateManager,
): void {
  const pulse = Math.floor(performance.now() / 400) % 2 === 0;
  if (!pulse) return;

  if (!states.flags.hasKey) {
    ctx.fillStyle = '#e8c56a';
    ctx.fillRect(272, FLOOR_Y - 30, 2, 2);
  }
  if (!states.flags.seenPhoto) {
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(168, 36, 2, 2);
  }
  if (states.flags.diaryUnlocked) {
    ctx.fillStyle = '#6ec6ff';
    ctx.fillRect(64, FLOOR_Y - 52, 2, 2);
  }
}

function drawPromptBar(ctx: CanvasRenderingContext2D, width: number, text: string): void {
  ctx.fillStyle = 'rgba(10, 10, 12, 0.75)';
  ctx.fillRect(0, PROMPT_Y - 8, width, 20);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '6px monospace';
  const tw = ctx.measureText(text).width;
  ctx.fillText(text, Math.round((width - tw) / 2), PROMPT_Y + 2);
}

function drawPhotoOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(8, 8, 12, 0.82)';
  ctx.fillRect(0, 0, width, height);

  const bx = 70;
  const by = 28;
  const bw = 180;
  const bh = 100;
  ctx.fillStyle = '#5a4a30';
  ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
  ctx.fillStyle = '#d4c4a0';
  ctx.fillRect(bx, by, bw, bh);

  // Sepia rynok sketch
  ctx.fillStyle = '#8a7050';
  ctx.fillRect(bx + 20, by + 50, 30, 40);
  ctx.fillRect(bx + 60, by + 40, 40, 50);
  ctx.fillRect(bx + 110, by + 55, 25, 35);
  ctx.fillStyle = '#a08060';
  ctx.fillRect(bx + 16, by + 36, 140, 8);
  ctx.fillStyle = '#c8b090';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(bx + 30 + i * 16, by + 20, 2, 2);
  }

  ctx.fillStyle = '#3a2a18';
  ctx.font = '7px monospace';
  ctx.fillText('Novgorod · Winter 1995', bx + 28, by + bh - 12);

  ctx.fillStyle = '#e8e4d8';
  ctx.font = '6px monospace';
  ctx.fillText('E / Enter · Close', width / 2 - 40, height - 16);
}

function drawToast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
): void {
  const tw = Math.min(width - 40, Math.max(120, text.length * 5 + 24));
  const bx = Math.round((width - tw) / 2);
  const by = height / 2 - 14;
  ctx.fillStyle = 'rgba(10, 10, 12, 0.9)';
  ctx.fillRect(bx, by, tw, 28);
  ctx.strokeStyle = '#e8c56a';
  ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 27);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '6px monospace';
  const mw = ctx.measureText(text).width;
  ctx.fillText(text, Math.round((width - mw) / 2), by + 17);
}

function drawDiarySelect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cursor: number,
): void {
  ctx.fillStyle = 'rgba(8, 6, 10, 0.88)';
  ctx.fillRect(0, 0, width, height);

  const bx = 40;
  const by = 24;
  const bw = width - 80;
  const bh = 120;
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
  ctx.fillStyle = '#c4a574';
  ctx.font = '8px monospace';
  ctx.fillText('DIARY — LEVEL SELECT', bx + 28, by + 22);

  ctx.fillStyle = '#8a6a48';
  ctx.fillRect(bx + 16, by + 32, bw - 32, 1);

  const levels = [
    { title: 'Level 1 · Novgorod Rynok', sub: 'Winter 1995', locked: false },
    { title: 'Level 2 · ???', sub: 'Locked', locked: true },
  ];

  levels.forEach((lvl, i) => {
    const ly = by + 48 + i * 28;
    const selected = !lvl.locked && i === cursor;
    if (selected) {
      ctx.fillStyle = 'rgba(232, 197, 106, 0.2)';
      ctx.fillRect(bx + 14, ly - 10, bw - 28, 24);
    }
    ctx.fillStyle = lvl.locked ? '#6a5a50' : selected ? '#e8c56a' : '#e8e4d8';
    ctx.font = '7px monospace';
    ctx.fillText(`${selected ? '>' : ' '} ${lvl.title}`, bx + 18, ly);
    ctx.font = '5px monospace';
    ctx.fillStyle = lvl.locked ? '#5a4a40' : '#a09080';
    ctx.fillText(lvl.sub, bx + 30, ly + 10);
  });

  ctx.fillStyle = '#e8e4d8';
  ctx.font = '6px monospace';
  ctx.fillText('Enter / E · Begin Level 1', bx + 40, by + bh - 12);
}
