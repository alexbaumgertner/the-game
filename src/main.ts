import { GameLoop } from './core/GameLoop';
import { StateManager } from './core/StateManager';
import { Player } from './entities/Player';
import { Gangster } from './entities/Gangster';
import { DialogueSystem } from './systems/DialogueSystem';
import { HUD } from './ui/HUD';

/** Internal pixel resolution — crisp, low-res arcade feel. */
const WIDTH = 320;
const HEIGHT = 180;

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Missing #game-canvas element');
  }

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Crisp pixels — never let the browser smooth our low-res buffer.
  ctx.imageSmoothingEnabled = false;

  const states = new StateManager();
  const player = new Player({ x: 64, y: 140, era: 'adult' });
  const thug = new Gangster({ x: 220, y: 140 });
  const dialogue = new DialogueSystem();
  const hud = new HUD();

  hud.set({
    hp: player.hp,
    maxHp: 100,
    eraLabel: 'ADULT · 1995',
    objective: 'Scaffold boot — Phase 1',
  });

  states.goto('level', { era: 'adult', data: { level: 0 } });

  const loop = new GameLoop({
    fixedDt: 1 / 60,
    update(dt) {
      states.update(dt);
      player.update(dt);
      thug.update(dt);
      dialogue.update(dt);
      hud.update(dt);
      hud.set({ hp: player.hp });
    },
    render(alpha) {
      // Clear + fill backdrop each frame
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#1a1a22';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Ground strip (procedural placeholder)
      ctx.fillStyle = '#2e2e38';
      ctx.fillRect(0, 148, WIDTH, HEIGHT - 148);
      ctx.fillStyle = '#3a3a48';
      ctx.fillRect(0, 148, WIDTH, 1);

      states.render(alpha);
      player.render(ctx, alpha);
      thug.render(ctx, alpha);
      dialogue.render(ctx, WIDTH, HEIGHT);
      hud.render(ctx, WIDTH, HEIGHT);

      // Tiny title mark so the first frame proves the loop is alive
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '8px monospace';
      ctx.fillText('NOVGOROD 1995', 110, 24);
    },
  });

  // Pause with Escape / P for loop smoke-test.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      loop.togglePause();
      hud.set({ paused: loop.isPaused });
    }
  });

  loop.start();

  // Expose for manual console smoke tests during scaffold.
  (window as unknown as { __novgorod?: unknown }).__novgorod = {
    loop,
    states,
    player,
    thug,
    dialogue,
    hud,
  };
}

bootstrap();
