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
import { BeerSystem } from './systems/BeerSystem';
import { preloadAerialsPoster } from './art/aerialsPoster';
import { preloadApartmentPhotos } from './art/apartmentPhotos';
import { createApartment2026Scene } from './scenes/Apartment2026';
import { createRynok1995Scene } from './scenes/Rynok1995';
import { createPodezd1995Scene } from './scenes/Podezd1995';
import { createVokzal1995Scene } from './scenes/Vokzal1995';
import { createGarazhi1995Scene } from './scenes/Garazhi1995';
import { createDvor1995Scene } from './scenes/Dvor1995';
import { createMost1995Scene } from './scenes/Most1995';
import { createDiskoteka1995Scene } from './scenes/Diskoteka1995';
import { createDetinets1995Scene } from './scenes/Detinets1995';
import type { DialogueSystem } from './systems/DialogueSystem';
import type { QuizSystem } from './systems/QuizSystem';
import { preloadFamilyFaces } from './art/familyFaces';
import { preloadBusBridgeViews } from './art/busBridgeViews';

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
  preloadAerialsPoster();
  preloadApartmentPhotos();
  preloadFamilyFaces();
  preloadBusBridgeViews();

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
  const beer = new BeerSystem();

  const apartment = createApartment2026Scene({ states, player, hud, beer });
  const rynok = createRynok1995Scene({ states, player, hud, beer });
  const podezd = createPodezd1995Scene({ states, player, hud, beer });
  const vokzal = createVokzal1995Scene({ states, player, hud, beer });
  const garazhi = createGarazhi1995Scene({ states, player, hud, beer });
  const dvor = createDvor1995Scene({ states, player, hud, beer });
  const most = createMost1995Scene({ states, player, hud, beer });
  const diskoteka = createDiskoteka1995Scene({ states, player, hud, beer });
  const detinets = createDetinets1995Scene({ states, player, hud, beer });

  states.register('apartment_2026', apartment);
  states.register('rynok_1995', rynok);
  states.register('podezd_1995', podezd);
  states.register('vokzal_1995', vokzal);
  states.register('garazhi_1995', garazhi);
  states.register('dvor_1995', dvor);
  states.register('most_1995', most);
  states.register('diskoteka_1995', diskoteka);
  states.register('detinets_1995', detinets);
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

  const sceneDialogue = (): DialogueSystem | null => {
    const scene = states.current.scene;
    if (scene === 'rynok_1995') return rynok.getDialogue();
    if (scene === 'podezd_1995') return podezd.getDialogue();
    if (scene === 'vokzal_1995') return vokzal.getDialogue();
    if (scene === 'garazhi_1995') return garazhi.getDialogue();
    if (scene === 'dvor_1995') return dvor.getDialogue();
    if (scene === 'most_1995') return most.getDialogue();
    if (scene === 'diskoteka_1995') return diskoteka.getDialogue();
    if (scene === 'detinets_1995') return detinets.getDialogue();
    if (scene === 'apartment_2026') return apartment.getDialogue();
    return null;
  };

  const sceneQuiz = (): QuizSystem | null => {
    const scene = states.current.scene;
    if (scene === 'rynok_1995') return rynok.getQuiz();
    if (scene === 'podezd_1995') return podezd.getQuiz();
    if (scene === 'vokzal_1995') return vokzal.getQuiz();
    if (scene === 'garazhi_1995') return garazhi.getQuiz();
    if (scene === 'dvor_1995') return dvor.getQuiz();
    if (scene === 'most_1995') return most.getQuiz();
    if (scene === 'diskoteka_1995') return diskoteka.getQuiz();
    if (scene === 'detinets_1995') return detinets.getQuiz();
    return null;
  };

  injectTouchControlStyles();
  const touch = new TouchControls({
    input,
    root: document.body,
    onPause: togglePause,
    getDialogueChoices: () => {
      const d = sceneDialogue();
      if (!d || !d.isOpen || !d.hasChoices) return { active: false };
      const labels = d.choiceLabels;
      return { active: true, labels: labels ?? undefined };
    },
    getQuizChoices: () => {
      const q = sceneQuiz();
      if (!q || !q.isOpen) return { active: false };
      return { active: true, labels: q.answerLabels ?? undefined };
    },
  });

  // Tap dialogue / quiz rows directly on the canvas (in addition to pad).
  const onCanvasPointer = (e: PointerEvent): void => {
    if (e.button !== undefined && e.button !== 0) return;
    const pt = clientToLogical(canvas, e.clientX, e.clientY);
    if (!pt) return;

    const q = sceneQuiz();
    if (q?.isOpen) {
      const qhit = q.hitTest(pt.x, pt.y, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      if (qhit === null) return;
      e.preventDefault();
      if (qhit === 'hint') {
        input.pulseVirtual('hint');
      } else {
        const map = ['choice1', 'choice2', 'choice3', 'choice4'] as const;
        input.pulseVirtual(map[qhit]!);
      }
      return;
    }

    const d = sceneDialogue();
    if (!d || !d.isOpen) return;
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
    beer,
    apartment,
    rynok,
    podezd,
    vokzal,
    garazhi,
    dvor,
    most,
    diskoteka,
    detinets,
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
    /** Debug: jump straight into подъезд Level 2. */
    gotoPodezd: () => {
      states.setFlag('level1Cleared', true);
      states.goto('podezd_1995', { era: 'ERA_1995', fadeSeconds: 0.15 });
    },
    /** Debug: jump straight into вокзал Level 3. */
    gotoVokzal: () => {
      states.setFlag('level1Cleared', true);
      states.setFlag('level2Cleared', true);
      states.goto('vokzal_1995', { era: 'ERA_1995', fadeSeconds: 0.15 });
    },
    /** Debug: jump straight into гаражи Level 4. */
    gotoGarazhi: () => {
      states.setFlag('level1Cleared', true);
      states.setFlag('level2Cleared', true);
      states.setFlag('level3Cleared', true);
      states.goto('garazhi_1995', { era: 'ERA_1995', fadeSeconds: 0.15 });
    },
    /** Debug: jump straight into двор Level 5. */
    gotoDvor: () => {
      states.setFlag('level1Cleared', true);
      states.setFlag('level2Cleared', true);
      states.setFlag('level3Cleared', true);
      states.setFlag('level4Cleared', true);
      states.goto('dvor_1995', { era: 'ERA_1995', fadeSeconds: 0.15 });
    },
    /** Debug: jump straight into мост Level 6. */
    gotoMost: () => {
      states.setFlag('level1Cleared', true);
      states.setFlag('level2Cleared', true);
      states.setFlag('level3Cleared', true);
      states.setFlag('level4Cleared', true);
      states.setFlag('level5Cleared', true);
      states.goto('most_1995', { era: 'ERA_1995', fadeSeconds: 0.15 });
    },
    /** Debug: jump straight into дискотека Level 7. */
    gotoDiskoteka: () => {
      states.setFlag('level1Cleared', true);
      states.setFlag('level2Cleared', true);
      states.setFlag('level3Cleared', true);
      states.setFlag('level4Cleared', true);
      states.setFlag('level5Cleared', true);
      states.setFlag('level6Cleared', true);
      states.goto('diskoteka_1995', { era: 'ERA_1995', fadeSeconds: 0.15 });
    },
    /** Debug: jump straight into детинец Level 8. */
    gotoDetinets: () => {
      states.setFlag('level1Cleared', true);
      states.setFlag('level2Cleared', true);
      states.setFlag('level3Cleared', true);
      states.setFlag('level4Cleared', true);
      states.setFlag('level5Cleared', true);
      states.setFlag('level6Cleared', true);
      states.setFlag('level7Cleared', true);
      states.goto('detinets_1995', { era: 'ERA_1995', fadeSeconds: 0.15 });
    },
    captureCanvas: () => canvas.toDataURL('image/png'),
  };
}

bootstrap();
