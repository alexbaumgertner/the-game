import { GameLoop } from './core/GameLoop';
import { Input } from './core/Input';
import { StateManager, type ProgressFlags, type SceneHandlers, type SceneId } from './core/StateManager';
import { clearSave, loadSave, writeSave } from './core/SaveGame';
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
import { preloadGarazhiGraffiti } from './art/garazhiGraffiti';
import { preloadVokzalPosters } from './art/vokzalPosters';
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

/** A registered scene: lifecycle handlers plus accessors for shared dialogue / quiz overlays. */
type SceneEntry = SceneHandlers & {
  getDialogue(): DialogueSystem;
  getQuiz?(): QuizSystem;
};

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
  preloadVokzalPosters();
  preloadGarazhiGraffiti();

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

  const deps = { states, player, hud, beer };
  const apartment = createApartment2026Scene(deps);
  const rynok = createRynok1995Scene(deps);
  const podezd = createPodezd1995Scene(deps);
  const vokzal = createVokzal1995Scene(deps);
  const garazhi = createGarazhi1995Scene(deps);
  const dvor = createDvor1995Scene(deps);
  const most = createMost1995Scene(deps);
  const diskoteka = createDiskoteka1995Scene(deps);
  const detinets = createDetinets1995Scene(deps);

  const scenes = {
    apartment_2026: apartment,
    rynok_1995: rynok,
    podezd_1995: podezd,
    vokzal_1995: vokzal,
    garazhi_1995: garazhi,
    dvor_1995: dvor,
    most_1995: most,
    diskoteka_1995: diskoteka,
    detinets_1995: detinets,
  } satisfies Record<SceneId, SceneEntry>;

  for (const [id, handlers] of Object.entries(scenes) as [SceneId, SceneEntry][]) {
    states.register(id, handlers);
  }

  // Restore saved progress before the first scene enters; start is always the apartment.
  const save = loadSave();
  if (save) {
    states.loadFlags(save.flags);
    beer.cans = save.beer.cans;
  }
  // After resetSave() the unload handlers must not write the old state back.
  let saveDisabled = false;
  const persist = (): void => {
    if (!saveDisabled) writeSave({ flags: states.flags, beer });
  };
  states.onFlagsChanged = persist;
  window.addEventListener('pagehide', persist);

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

  const pauseGame = (): void => {
    if (loop.isPaused) return;
    loop.pause();
    hud.set({ paused: loop.isPaused });
  };

  const resumeGame = (): void => {
    if (!loop.isPaused) return;
    loop.resume();
    hud.set({ paused: loop.isPaused });
  };

  const togglePause = (): void => {
    if (loop.isPaused) resumeGame();
    else pauseGame();
  };

  // Backgrounded tab: save and pause; the player resumes manually on return.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    persist();
    pauseGame();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      togglePause();
    }
  });

  const sceneDialogue = (): DialogueSystem | null =>
    scenes[states.current.scene].getDialogue();

  const sceneQuiz = (): QuizSystem | null =>
    (scenes[states.current.scene] as SceneEntry).getQuiz?.() ?? null;

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

  /** Debug level jumps: `gotoX` marks all earlier levels cleared, then fades into the scene. */
  const LEVEL_JUMPS: { name: string; scene: SceneId }[] = [
    { name: 'gotoRynok', scene: 'rynok_1995' },
    { name: 'gotoPodezd', scene: 'podezd_1995' },
    { name: 'gotoVokzal', scene: 'vokzal_1995' },
    { name: 'gotoGarazhi', scene: 'garazhi_1995' },
    { name: 'gotoDvor', scene: 'dvor_1995' },
    { name: 'gotoMost', scene: 'most_1995' },
    { name: 'gotoDiskoteka', scene: 'diskoteka_1995' },
    { name: 'gotoDetinets', scene: 'detinets_1995' },
  ];
  const debugGotos: Record<string, () => void> = {};
  LEVEL_JUMPS.forEach(({ name, scene }, index) => {
    debugGotos[name] = () => {
      for (let n = 1; n <= index; n++) {
        states.setFlag(`level${n}Cleared` as keyof ProgressFlags, true);
      }
      states.goto(scene, { era: 'ERA_1995', fadeSeconds: 0.15 });
    };
  });

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
    ...debugGotos,
    /** Debug: wipe the save and reload the page. */
    resetSave: () => {
      saveDisabled = true;
      clearSave();
      location.reload();
    },
    captureCanvas: () => canvas.toDataURL('image/png'),
  };
}

bootstrap();
