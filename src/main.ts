import { GameLoop } from './core/GameLoop';
import { Input } from './core/Input';
import { StateManager } from './core/StateManager';
import {
  ART_SCALE,
  assertCrispTransform,
  clientToLogical,
  configureDisplay,
  getDisplayMetrics,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
} from './core/Display';
import { Player } from './entities/Player';
import { HUD } from './ui/HUD';
import { injectTouchControlStyles, TouchControls } from './ui/TouchControls';
import { createApartment2026Scene } from './scenes/Apartment2026';
import { createRynok1995Scene } from './scenes/Rynok1995';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Missing #game-canvas element');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Crisp pixels — never let the browser smooth our buffer.
  ctx.imageSmoothingEnabled = false;
  configureDisplay(canvas, ctx);

  const onResize = (): void => {
    configureDisplay(canvas, ctx);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => {
    // iOS often reports stale innerWidth until after orientation settles.
    window.setTimeout(onResize, 50);
  });

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
      assertCrispTransform(ctx);
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Scenes own their full backdrop; fade paints last so HUD is covered too.
      states.render(ctx, alpha, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      assertCrispTransform(ctx);
      hud.render(ctx, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      assertCrispTransform(ctx);
      states.renderFade(ctx, LOGICAL_WIDTH, LOGICAL_HEIGHT);
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
    const pt = clientToLogical(canvas, e.clientX, e.clientY);
    if (!pt) return;
    const hit = d.hitTest(pt.x, pt.y, LOGICAL_WIDTH, LOGICAL_HEIGHT);
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
    display: {
      LOGICAL_WIDTH,
      LOGICAL_HEIGHT,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
      ART_SCALE,
      getMetrics: getDisplayMetrics,
    },
    /** Debug: jump straight into rynok Level 1. */
    gotoRynok: () => states.goto('rynok_1995', { era: 'ERA_1995', fadeSeconds: 0.15 }),
    captureCanvas: () => canvas.toDataURL('image/png'),
  };
}

bootstrap();
