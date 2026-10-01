import { GameLoop } from './core/GameLoop';
import { Input } from './core/Input';
import { StateManager } from './core/StateManager';
import { Player } from './entities/Player';
import { HUD } from './ui/HUD';
import { createApartment2026Scene } from './scenes/Apartment2026';
import { createRynok1995Scene } from './scenes/Rynok1995';

/** Internal pixel resolution — crisp, low-res arcade feel. */
const WIDTH = 320;
const HEIGHT = 180;

function fitCanvas(canvas: HTMLCanvasElement): void {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT)));
  canvas.style.width = `${WIDTH * scale}px`;
  canvas.style.height = `${HEIGHT * scale}px`;
}

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Missing #game-canvas element');
  }

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  fitCanvas(canvas);
  window.addEventListener('resize', () => fitCanvas(canvas));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Crisp pixels — never let the browser smooth our low-res buffer.
  ctx.imageSmoothingEnabled = false;

  const input = new Input();
  const states = new StateManager();
  states.input = input;

  const player = new Player({ x: 100, y: 152, era: 'adult' });
  const hud = new HUD();

  const apartment = createApartment2026Scene({ states, player, hud });
  const rynok = createRynok1995Scene({ states, player, hud });

  states.register('apartment_2026', apartment);
  states.register('rynok_1995', rynok);
  states.boot('apartment_2026', { era: 'ERA_2026' });

  const loop = new GameLoop({
    fixedDt: 1 / 60,
    update(dt) {
      states.update(dt);
      hud.update(dt);
      hud.set({ hp: player.hp });
    },
    render(alpha) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Scenes own their full backdrop; StateManager draws fade on top.
      states.render(ctx, alpha, WIDTH, HEIGHT);
      hud.render(ctx, WIDTH, HEIGHT);
    },
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      loop.togglePause();
      hud.set({ paused: loop.isPaused });
    }
  });

  loop.start();

  (window as unknown as { __novgorod?: unknown }).__novgorod = {
    loop,
    states,
    player,
    input,
    hud,
  };
}

bootstrap();
