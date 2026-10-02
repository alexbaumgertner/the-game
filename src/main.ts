import { GameLoop } from './core/GameLoop';
import { Input } from './core/Input';
import { StateManager } from './core/StateManager';
import { Player } from './entities/Player';
import { HUD } from './ui/HUD';
import { injectTouchControlStyles, TouchControls } from './ui/TouchControls';
import { createApartment2026Scene } from './scenes/Apartment2026';
import { createRynok1995Scene } from './scenes/Rynok1995';

/** Internal pixel resolution — Genesis-like 320×224, CSS-scaled to fit. */
const WIDTH = 320;
const HEIGHT = 224;

/**
 * Scale canvas to fit the viewport (portrait + landscape).
 * Fractional scale is OK — `image-rendering: pixelated` keeps crisps.
 * Letterbox/pillarbox comes from #app filling the leftover dark space.
 */
function fitCanvas(canvas: HTMLCanvasElement): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / WIDTH, vh / HEIGHT);
  const cssW = Math.max(1, Math.floor(WIDTH * scale));
  const cssH = Math.max(1, Math.floor(HEIGHT * scale));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
}

/** Map a client pointer into internal canvas pixel space. */
function clientToCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = ((clientX - rect.left) / rect.width) * WIDTH;
  const y = ((clientY - rect.top) / rect.height) * HEIGHT;
  return { x, y };
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
  window.addEventListener('orientationchange', () => {
    // iOS often reports stale innerWidth until after orientation settles.
    window.setTimeout(() => fitCanvas(canvas), 50);
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Crisp pixels — never let the browser smooth our low-res buffer.
  ctx.imageSmoothingEnabled = false;

  const input = new Input();
  const states = new StateManager();
  states.input = input;

  const player = new Player({ x: 100, y: 192, era: 'adult' });
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
      player.syncHp();
      hud.set({
        hp: player.hp,
        fortitude: player.mentalFortitude,
        swagger: player.streetSwagger,
      });
    },
    render(alpha) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Scenes own their full backdrop; fade paints last so HUD is covered too.
      states.render(ctx, alpha, WIDTH, HEIGHT);
      hud.render(ctx, WIDTH, HEIGHT);
      states.renderFade(ctx, WIDTH, HEIGHT);
    },
  });

  const togglePause = (): void => {
    loop.togglePause();
    hud.set({ paused: loop.isPaused });
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      togglePause();
    }
  });

  injectTouchControlStyles();
  const touch = new TouchControls({
    input,
    root: document.body,
    onPause: togglePause,
    getDialogueChoices: () => {
      if (states.current.scene !== 'rynok_1995') return { active: false };
      const d = rynok.getDialogue();
      if (!d.isOpen || !d.hasChoices) return { active: false };
      const labels = d.choiceLabels;
      return { active: true, labels: labels ?? undefined };
    },
  });

  // Tap dialogue box / choice rows directly on the canvas (in addition to pad).
  const onCanvasPointer = (e: PointerEvent): void => {
    if (e.button !== undefined && e.button !== 0) return;
    if (states.current.scene !== 'rynok_1995') return;
    const d = rynok.getDialogue();
    if (!d.isOpen) return;
    const pt = clientToCanvas(canvas, e.clientX, e.clientY);
    if (!pt) return;
    const hit = d.hitTest(pt.x, pt.y, WIDTH, HEIGHT);
    if (hit === null) return;
    e.preventDefault();
    if (hit === 'advance') {
      input.pulseVirtual('confirm');
    } else {
      input.pulseVirtual(hit === 0 ? 'choice1' : 'choice2');
    }
  };
  canvas.addEventListener('pointerdown', onCanvasPointer);

  // Block pull-to-refresh / rubber-band while gestures hit the play surface.
  const blockGesture = (e: Event): void => {
    e.preventDefault();
  };
  document.addEventListener('gesturestart', blockGesture, { passive: false });
  document.addEventListener('gesturechange', blockGesture, { passive: false });
  document.body.addEventListener(
    'touchmove',
    (e) => {
      // Only block when the touch is not on a form control (we have none).
      e.preventDefault();
    },
    { passive: false },
  );

  loop.start();

  (window as unknown as { __novgorod?: unknown }).__novgorod = {
    loop,
    states,
    player,
    input,
    hud,
    rynok,
    touch,
    canvas,
    /** Debug: jump straight into rynok Level 1. */
    gotoRynok: () => states.goto('rynok_1995', { era: 'ERA_1995', fadeSeconds: 0.15 }),
    captureCanvas: () => canvas.toDataURL('image/png'),
  };
}

bootstrap();
