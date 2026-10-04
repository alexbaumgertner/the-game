/**
 * ERA_2026 — хрущёвка Зуича (Дом).
 * Туалет ← комната → кухня → ванная.
 * Интро: комп → кошка → комод → дневник.
 * Квесты: сигареты; после L1 — лоток; после L2 — помыться.
 * ПИВО (ромашковый чай): pickups + TeaSystem (жажда; без запоя).
 */

import type { SceneContext, StateManager } from '@/core/StateManager';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { APT_PAL, CAT_PAL } from '@/art/segaPalette';
import { drawAerialsPoster, preloadAerialsPoster } from '@/art/aerialsPoster';
import {
  drawFamilyPhotoFace,
  drawTiledWallpaper,
  drawWallFamilyFrame,
  drawWindowParade,
  preloadApartmentPhotos,
} from '@/art/apartmentPhotos';
import {
  BATH_ORIGIN,
  CIGARETTES_X,
  CHAIN_X,
  FLOOR_Y as APT_FLOOR_Y,
  IPPOLIT_X,
  KITCHEN_ORIGIN,
  LITTER_X,
  ROOM_ORIGIN,
  ROOM_W,
  TUB_X,
  TOILET_ORIGIN,
  WORLD_W,
  drawBathroom,
  drawTeaMug,
  drawCigarettePack,
  drawDoorwayArch,
  drawKitchen,
  drawRoomCups,
  drawToiletRoom,
  preloadIppolitFace,
  preloadKitchenFramePhoto,
} from '@/art/apartmentExpand';
import {
  ditherRect,
  px,
  segaBox,
  speckles,
  woodGrain,
} from '@/art/pixelDraw';
import {
  drawInteractPrompt,
  drawUiText,
  drawUiTextCentered,
  HotspotHintClock,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import { ParallaxStack } from '@/render/ParallaxLayer';
import { applyLightingOverlay } from '@/render/LightingOverlay';
import { DialogueSystem, type DialogueScript } from '@/systems/DialogueSystem';
import {
  LEVELS,
  YEAR_STRIP,
  levelYearKey,
} from '@/data/levels';
import { PIVO_FIRST_PICKUP } from '@/systems/TeaSystem';
import type { ProgressFlags } from '@/core/StateManager';
import { QuizSystem } from '@/systems/QuizSystem';
import {
  CHITALNYA_THEMES,
  chitalnyaThemeUnlocked,
  type ChitalnyaThemeId,
} from '@/data/philosophyExpand';

const WIDTH = LOGICAL_WIDTH;
const FLOOR_Y = APT_FLOOR_Y;
const PROMPT_Y = 210;
const P = APT_PAL;
/** Desk / PC seat X (living room). */
const DESK_X = ROOM_ORIGIN + 92;
/** Dresser (комод) hotspot. */
const DRESSER_X = ROOM_ORIGIN + 236;
const DRESSER_W = 70;
/** Bookshelf «Читальня» near desk. */
const BOOKSHELF_X = ROOM_ORIGIN + 40;
const BOOKSHELF_W = 36;

interface TeaCup {
  x: number;
  taken: boolean;
}

export type OverlayMode = 'none' | 'photo' | 'toast' | 'diary' | 'chitalnya';

export interface ApartmentSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: TeaSystem; // window alias; same TeaSystem instance
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

/** After Level 1 bus home — cat asks what is next. */
const AFTER_LEVEL1_SCRIPT: DialogueScript = {
  id: 'after_level1_cat',
  start: 'back',
  lines: {
    back: {
      speaker: 'Зуич',
      text: 'Дом… 2026. Рынок, сестрёнка, семёрка через мост — всё это было.',
      next: 'cat',
    },
    cat: {
      speaker: 'Кошка',
      text: 'Что дальше?',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Что ответить?',
      choices: [
        { id: 'diary', label: 'Открою дневник — выпускной.', effect: 'none', next: 'ok' },
        { id: 'rest', label: 'Сначала побуду здесь.', effect: 'none', next: 'ok' },
      ],
    },
    ok: {
      speaker: 'Кошка',
      text: 'Мяу. И лоток в туалете — не забудь.',
      next: null,
    },
  },
};

const IPPOLIT_SCRIPT: DialogueScript = {
  id: 'ippolit_back',
  start: 'ask',
  lines: {
    ask: {
      speaker: 'Ипполит',
      text: 'Потрите мне спинку, пожалуйста! Ну, пожалуйста… Что вам трудно, что ли?',
      next: 'hint',
    },
    hint: {
      speaker: 'Ипполит',
      text: 'Сигареты? Ищите у холодильника на кухне. А я тут… с лёгким паром.',
      next: null,
    },
  },
};

const IPPOLIT_WASH_SCRIPT: DialogueScript = {
  id: 'ippolit_wash',
  start: 'ask',
  lines: {
    ask: {
      speaker: 'Ипполит',
      text: 'Потрите спинку — и сами залезайте. Вода горяченькая пошла!',
      next: null,
    },
  },
};

const CAT_LITTER_SCRIPT: DialogueScript = {
  id: 'cat_litter',
  start: 'ask',
  lines: {
    ask: {
      speaker: 'Кошка',
      text: 'Почисти лоток. Мяу. Я ходила — теперь твоя очередь.',
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
  let diaryScroll = 0;
  let prompt = 'ИССЛЕДУЙ КВАРТИРУ';
  let time = 0;
  let camX = ROOM_ORIGIN;
  let depthCam = 0;
  const stack = new ParallaxStack();
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();
  let chitalnyaCursor = 0;
  let chitalnyaTheme: ChitalnyaThemeId | null = null;
  let chitalnyaQ = 0;
  let introStarted = false;
  let teaCups: TeaCup[] = [];
  const hotspotHints = new HotspotHintClock();
  let flushT = 0;
  let ippolitSpoke = false;
  let cigarettesTaken = false;
  let catLitterAsked = false;

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
    if (states.flags.level1Cleared && !states.flags.litterCleaned) {
      prompt = 'ТУАЛЕТ ← ЛОТОК КОШКИ';
      hud.set({ objective: 'Почисти лоток' });
      return;
    }
    if (!states.flags.cigarettesFound && !cigarettesTaken) {
      prompt = 'НАЙДИ СИГАРЕТЫ → КУХНЯ';
      hud.set({ objective: 'Найди сигареты' });
      return;
    }
    if (states.flags.level2Cleared && !states.flags.bathed) {
      prompt = 'ВАННАЯ → ПОМОЙСЯ';
      hud.set({ objective: 'Помойся' });
      return;
    }
    let nextId = 0;
    for (const lvl of LEVELS) {
      const cleared = !!states.flags[`level${lvl.id}Cleared` as keyof ProgressFlags];
      if (!cleared) {
        nextId = lvl.id;
        break;
      }
    }
    if (nextId > 0) {
      prompt = nextId === 1 ? 'ДНЕВНИК - ВЫБОР УРОВНЯ' : `ДНЕВНИК - УРОВЕНЬ ${nextId} ГОТОВ`;
      hud.set({ objective: `Дневник - ур. ${nextId}` });
    } else {
      prompt = 'ДНЕВНИК - ВОСПОМИНАНИЯ';
      hud.set({ objective: 'Дневник - повтор' });
    }
  };

  const nearDresser = (): boolean =>
    player.x >= DRESSER_X && player.x <= DRESSER_X + DRESSER_W;

  const nearBookshelf = (): boolean =>
    player.x >= BOOKSHELF_X && player.x <= BOOKSHELF_X + BOOKSHELF_W;

  const chitalnyaAvailable = (): boolean =>
    states.flags.level9Cleared || states.flags.level11Cleared || states.flags.level12Cleared;

  const nearTea = (): TeaCup | null => {
    for (const c of teaCups) {
      if (!c.taken && Math.abs(player.x - c.x) < 18) return c;
    }
    return null;
  };

  const nearChain = (): boolean => Math.abs(player.x - CHAIN_X) < 22;
  const nearLitter = (): boolean => Math.abs(player.x - LITTER_X) < 22;
  const nearCigarettes = (): boolean =>
    !cigarettesTaken &&
    !states.flags.cigarettesFound &&
    Math.abs(player.x - CIGARETTES_X) < 22;
  const nearIppolit = (): boolean => Math.abs(player.x - IPPOLIT_X) < 28;
  const nearTub = (): boolean => Math.abs(player.x - TUB_X) < 32;
  const inToilet = (): boolean =>
    player.x >= TOILET_ORIGIN && player.x < ROOM_ORIGIN;

  const activePrompt = (): string | null => {
    if (overlay !== 'none' || dialogue.isOpen) return null;
    if (!states.flags.introDone) return null;
    if (nearDresser() && !states.flags.diaryUnlocked) return 'Открыть комод';
    if (nearDresser() && states.flags.diaryUnlocked) return 'Открыть дневник';
    if (nearChain()) return 'Дёрнуть цепочку';
    if (
      nearLitter() &&
      states.flags.level1Cleared &&
      !states.flags.litterCleaned
    ) {
      return 'Почистить лоток';
    }
    if (nearCigarettes()) return 'Взять сигареты';
    if (
      nearTub() &&
      states.flags.level2Cleared &&
      !states.flags.bathed
    ) {
      return 'Помыться';
    }
    if (nearIppolit()) return 'Поговорить';
    const can = nearTea();
    if (can) return 'Взять ПИВО';
    return null;
  };

  const tryInteract = (): void => {
    const input = states.input;
    if (!input) return;
    if (!input.justPressed('interact') && !input.justPressed('confirm')) return;
    if (player.inspecting) return;
    if (dialogue.isOpen) return;

    if (overlay === 'photo') {
      overlay = 'diary';
      diaryCursor = nextDiaryCursor();
      hud.set({ objective: 'Выбери воспоминание' });
      return;
    }
    if (overlay === 'toast') {
      overlay = 'none';
      toastTimer = 0;
      return;
    }
    if (overlay === 'diary' || overlay === 'chitalnya') return;

    if (!states.flags.introDone) return;

    const can = nearTea();
    if (can) {
      player.beginInspect(0.35);
      can.taken = true;
      beer.pickup(1);
      if (beer.needsAcronymToast) {
        beer.needsAcronymToast = false;
        showToast(PIVO_FIRST_PICKUP, 3.2);
      } else {
        showToast('Чашка ромашки.');
      }
      return;
    }

    if (nearChain()) {
      player.beginInspect(0.35);
      flushT = 1.25;
      showToast('Смыв! Грохот на весь подъезд.');
      return;
    }

    if (
      nearLitter() &&
      states.flags.level1Cleared &&
      !states.flags.litterCleaned
    ) {
      player.beginInspect(0.45);
      states.setFlag('litterCleaned', true);
      showToast('Лоток чист. Кошка довольна.');
      refreshObjective();
      return;
    }

    if (nearCigarettes()) {
      player.beginInspect(0.4);
      cigarettesTaken = true;
      states.setFlag('cigarettesFound', true);
      showToast('Сигареты. Пачка мятая, но своя.');
      refreshObjective();
      return;
    }

    if (
      nearTub() &&
      states.flags.level2Cleared &&
      !states.flags.bathed
    ) {
      player.beginInspect(0.5);
      if (!ippolitSpoke) {
        dialogue.open(IPPOLIT_WASH_SCRIPT, () => {
          ippolitSpoke = true;
          states.setFlag('bathed', true);
          showToast('С лёгким паром. Ты помылся.');
          refreshObjective();
        });
      } else {
        states.setFlag('bathed', true);
        showToast('С лёгким паром. Ты помылся.');
        refreshObjective();
      }
      return;
    }

    if (nearIppolit()) {
      player.beginInspect(0.35);
      if (!ippolitSpoke) {
        dialogue.open(IPPOLIT_SCRIPT, () => {
          ippolitSpoke = true;
        });
      } else {
        showToast('Ипполит булькает в пальто.');
      }
      return;
    }

    if (nearBookshelf() && chitalnyaAvailable()) {
      player.beginInspect(0.35);
      overlay = 'chitalnya';
      chitalnyaCursor = 0;
      chitalnyaTheme = null;
      quiz.closeSilent();
      hud.set({ objective: 'Читальня — тема' });
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
      diaryCursor = nextDiaryCursor();
      hud.set({ objective: 'Выбери воспоминание' });
    }
  };

  const tryDrink = (): void => {
    const input = states.input;
    if (!input?.justPressed('beer')) return;
    if (dialogue.isOpen || overlay === 'diary' || overlay === 'photo' || overlay === 'chitalnya') return;
    if (beer.drink()) {
      showToast('ПИВО согрело.');
    } else if (beer.cups <= 0) {
      showToast('Нет ПИВО. Ищи чашки.');
    }
  };

  const walkAxis = (inputAxis: number): number => inputAxis;

  const isLevelUnlocked = (id: number): boolean => {
    if (id <= 1) return true;
    const prev = `level${id - 1}Cleared` as keyof ProgressFlags;
    return !!states.flags[prev];
  };

  const isLevelCleared = (id: number): boolean => {
    const key = `level${id}Cleared` as keyof ProgressFlags;
    return !!states.flags[key];
  };

  const maxDiaryCursor = (): number => {
    let max = 0;
    for (const lvl of LEVELS) {
      if (isLevelUnlocked(lvl.id)) max = lvl.id - 1;
    }
    return max;
  };

  const nextDiaryCursor = (): number => {
    for (const lvl of LEVELS) {
      if (!isLevelCleared(lvl.id)) return lvl.id - 1;
    }
    return 0;
  };

  const VISIBLE_ROWS = 6;


  const updateChitalnya = (dt: number): void => {
    const input = states.input;
    if (!input) return;
    if (quiz.isOpen) {
      if (input.justPressed('choice1')) {
        const r = quiz.selectAnswer(0);
        if (r === 'wrong') player.takeDamage(14, -1);
      }
      if (input.justPressed('choice2')) {
        const r = quiz.selectAnswer(1);
        if (r === 'wrong') player.takeDamage(14, -1);
      }
      if (input.justPressed('choice3')) {
        const r = quiz.selectAnswer(2);
        if (r === 'wrong') player.takeDamage(14, -1);
      }
      if (input.justPressed('choice4')) {
        const r = quiz.selectAnswer(3);
        if (r === 'wrong') player.takeDamage(14, -1);
      }
      if (input.justPressed('hint') && quiz.takeHint()) {
        player.takeDamage(14, -1);
      }
      quiz.update(dt);
      return;
    }

    const unlocked = CHITALNYA_THEMES.filter((th) =>
      chitalnyaThemeUnlocked(th, states.flags),
    );
    if (unlocked.length === 0) {
      if (input.justPressed('confirm') || input.justPressed('interact') || input.justPressed('kick')) {
        overlay = 'none';
      }
      return;
    }

    if (chitalnyaTheme === null) {
      if (input.justPressed('up') || input.justPressed('left')) {
        chitalnyaCursor = Math.max(0, chitalnyaCursor - 1);
      }
      if (input.justPressed('down') || input.justPressed('right')) {
        chitalnyaCursor = Math.min(unlocked.length - 1, chitalnyaCursor + 1);
      }
      if (input.justPressed('kick')) {
        overlay = 'none';
        return;
      }
      if (input.justPressed('confirm') || input.justPressed('interact')) {
        const th = unlocked[chitalnyaCursor];
        if (!th) return;
        chitalnyaTheme = th.id;
        chitalnyaQ = 0;
        quiz.openFromBank('Читальня', th.bank, 0, () => {
          chitalnyaQ += 1;
          if (chitalnyaQ >= 3) {
            showToast('Хватит на сегодня. Можно ещё.', 2);
            chitalnyaTheme = null;
          } else {
            quiz.openFromBank('Читальня', th.bank, chitalnyaQ);
          }
        });
      }
      return;
    }

    if (input.justPressed('kick')) {
      quiz.closeSilent();
      chitalnyaTheme = null;
    }
  };

  const updateDiarySelect = (dt: number): void => {
    void dt;
    const input = states.input;
    if (!input) return;

    const maxCursor = maxDiaryCursor();

    if (input.justPressed('up') || input.justPressed('left')) {
      diaryCursor = Math.max(0, diaryCursor - 1);
    }
    if (input.justPressed('down') || input.justPressed('right')) {
      diaryCursor = Math.min(maxCursor, diaryCursor + 1);
    }
    if (diaryCursor < diaryScroll) diaryScroll = diaryCursor;
    if (diaryCursor >= diaryScroll + VISIBLE_ROWS) {
      diaryScroll = diaryCursor - VISIBLE_ROWS + 1;
    }

    if (input.justPressed('confirm') || input.justPressed('interact')) {
      const lvl = LEVELS[diaryCursor];
      if (!lvl || !isLevelUnlocked(lvl.id)) return;
      const sel = `level${lvl.id}Selected` as keyof ProgressFlags;
      states.setFlag(sel, true);
      overlay = 'none';
      states.goto(lvl.scene, {
        era: lvl.era,
        data: { level: lvl.id },
        fadeSeconds: 0.55,
      });
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

  /** Cat world X — follows into toilet after L1 / when player is there. */
  const catWorldX = (): number => {
    if (inToilet() && states.flags.level1Cleared) {
      return LITTER_X + 28;
    }
    if (inToilet()) return LITTER_X + 20;
    return ROOM_ORIGIN + 58;
  };

  return {
    enter(ctx: SceneContext): void {
      preloadAerialsPoster();
      preloadApartmentPhotos();
      preloadIppolitFace();
      preloadKitchenFramePhoto();
      beer.resetForApartment();
      player.setEra('adult');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.setFloorY(FLOOR_Y);
      player.x = DESK_X;
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 52;
      camX = Math.max(0, Math.min(WORLD_W - WIDTH, player.x - WIDTH * 0.4));
      overlay = 'none';
      toast = '';
      toastTimer = 0;
      diaryCursor = 0;
      dialogue.resetSilent();
      introStarted = false;
      hotspotHints.clear();
      flushT = 0;
      ippolitSpoke = false;
      cigarettesTaken = states.flags.cigarettesFound;
      catLitterAsked = false;
      teaCups = [
        { x: ROOM_ORIGIN + 48, taken: false },
        { x: ROOM_ORIGIN + 168, taken: false },
        { x: ROOM_ORIGIN + 300, taken: false },
        { x: KITCHEN_ORIGIN + 90, taken: false },
        { x: BATH_ORIGIN + 60, taken: false },
        { x: TOILET_ORIGIN + 100, taken: false },
      ];
      hud.set({
        hp: player.hp,
        maxHp: MAX_FORTITUDE,
        maxFortitude: MAX_FORTITUDE,
        eraLabel: 'ЗУИЧ · 2026',
        levelTitle: 'Хрущёвка',
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
      } else if (ctx.data?.afterLevel1 && states.flags.level1Cleared) {
        dialogue.open(AFTER_LEVEL1_SCRIPT, () => {
          showToast('Лоток в туалете ← и дневник — ур. 2.', 2.8);
          refreshObjective();
        });
      } else if (ctx.data?.afterLevel2 && states.flags.level2Cleared) {
        showToast('Выпускной закрыт. Можно помыться →', 2.8);
        refreshObjective();
      } else if (ctx.data?.epilogueFinale && states.flags.level8Cleared) {
        showToast('Долг закрыт. Зуич дочитал зиму.', 3.4);
      } else if (ctx.data?.epilogue && states.flags.level5Cleared) {
        showToast('Зима 1995 закрыта. Зуич помнит.', 3.2);
      }
    },

    exit(): void {
      overlay = 'none';
      dialogue.resetSilent();
    },

    update(dt: number): void {
      time += dt;
      player.update(dt);
      if (flushT > 0) flushT = Math.max(0, flushT - dt);

      const targetCam = player.x - WIDTH * 0.42;
      camX += (targetCam - camX) * Math.min(1, dt * 6);
      if (camX < 0) camX = 0;
      if (camX > WORLD_W - WIDTH) camX = WORLD_W - WIDTH;
      depthCam += ((player.x - ROOM_ORIGIN - WIDTH / 2) * 0.08 - depthCam) * Math.min(1, dt * 4);

      if (states.flags.introDone) beer.update(dt);

      if (!introStarted && !states.flags.introDone) {
        dialogue.open(INTRO_SCRIPT, () => {
          states.setFlag('introDone', true);
          showToast('Встань и подойди к комоду.');
          refreshObjective();
        });
        introStarted = true;
      }

      // Cat asks to clean litter when player enters toilet after L1
      if (
        states.flags.introDone &&
        !dialogue.isOpen &&
        overlay === 'none' &&
        states.flags.level1Cleared &&
        !states.flags.litterCleaned &&
        inToilet() &&
        !catLitterAsked
      ) {
        catLitterAsked = true;
        dialogue.open(CAT_LITTER_SCRIPT, () => {
          showToast('Почисти лоток (E).');
          refreshObjective();
        });
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
      if (overlay === 'chitalnya') {
        updateChitalnya(dt);
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
      const rawAxis = frozen ? 0 : (states.input?.axisX() ?? 0);
      const axis = frozen ? 0 : walkAxis(rawAxis);
      if (states.flags.introDone) {
        const baseSpeed = 52;
        player.walkSpeed =
          false && !cigarettesTaken && !states.flags.cigarettesFound
            ? baseSpeed * 1.35
            : baseSpeed;
        player.applyWalk(axis, dt, 20, WORLD_W - 20);
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
      const cigsGone = cigarettesTaken || states.flags.cigarettesFound;
      stack.setLayers([
        {
          id: 'world',
          speedRatio: 1,
          zIndex: 0,
          draw: (c) => {
            drawApartmentWorld(
              c,
              height,
              depthCam,
              teaCups,
              time,
              flushT,
              states.flags.litterCleaned,
              ippolitSpoke,
              states.flags.bathed,
              cigsGone,
            );
          },
        },
        {
          id: 'gameplay',
          speedRatio: 1,
          zIndex: 10,
          draw: (c) => {
            drawCatAt(c, catWorldX(), time);
            player.render(c, alpha);
            if (!dialogue.isOpen && overlay === 'none') {
              drawHotspotHints(c, states, teaCups, time, player.x, hotspotHints, {
                cigarettesGone: cigsGone,
                flushBusy: flushT > 0,
              });
            }
          },
        },
        {
          id: 'lighting',
          speedRatio: 0,
          zIndex: 20,
          screenSpace: true,
          draw: (c, _s, _cam, w, h) => {
            // Soft ambient only — NO desk/computer lamp bloom
            const winScreenX = ROOM_ORIGIN + 250 - camX;
            applyLightingOverlay(
              c,
              0,
              w,
              h,
              {
                ambient: { color: 'rgba(36, 30, 42, 0.28)' },
                points: [
                  {
                    kind: 'point',
                    // Cool spill from night window only (no desk/PC lamp bloom)
                    x: winScreenX,
                    y: 72,
                    radius: 36,
                    color: '#7090c8',
                    screenSpace: true,
                  },
                ],
                cones: [],
                time,
              },
            );
          },
        },
      ]);
      stack.render(ctx, camX, width, height);

      if (overlay === 'none' && !dialogue.isOpen && !activePrompt() && prompt) {
        drawPromptBar(ctx, width, prompt);
      }

      if (overlay === 'photo') drawPhotoOverlay(ctx, width, height);
      if (overlay === 'toast') drawToast(ctx, width, height, toast);
      if (overlay === 'diary') {
        drawDiarySelect(ctx, width, height, diaryCursor, diaryScroll, states.flags);
      }
      if (overlay === 'chitalnya') {
        drawChitalnya(ctx, width, height, chitalnyaCursor, states.flags, chitalnyaTheme);
        if (quiz.isOpen) quiz.render(ctx, width, height);
      }

      if (dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      }

      if (states.flags.introDone) {
        // Thoughts use screen X
        beer.renderCrisis(ctx, width, height, player.x - camX, player.y);
        beer.renderHud(ctx, width);
      }
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    getQuiz(): QuizSystem {
      return quiz;
    },

    /** Debug / capture helper — force UI overlay. */
    setOverlay(mode: OverlayMode): void {
      overlay = mode;
    },

    /** Debug / capture — snap camera to world X (left edge). */
    setCamX(x: number): void {
      camX = Math.max(0, Math.min(WORLD_W - WIDTH, x));
    },
  };
}

function drawApartmentWorld(
  ctx: CanvasRenderingContext2D,
  height: number,
  depthCam: number,
  teaCups: TeaCup[],
  time: number,
  flushT: number,
  litterClean: boolean,
  ippolitSpoke: boolean,
  bathed: boolean,
  cigarettesGone: boolean,
): void {
  // Toilet
  drawToiletRoom(ctx, TOILET_ORIGIN, height, time, flushT, litterClean);

  // Living room
  ctx.save();
  ctx.beginPath();
  ctx.rect(ROOM_ORIGIN, 0, ROOM_W, height);
  ctx.clip();
  ctx.translate(ROOM_ORIGIN, 0);
  drawLivingRoom(ctx, ROOM_W, height, depthCam, time);
  ctx.restore();

  drawDoorwayArch(ctx, ROOM_ORIGIN + 4, '← туалет');
  drawDoorwayArch(ctx, ROOM_ORIGIN + ROOM_W - 4, 'кухня →');
  drawRoomCups(ctx, ROOM_ORIGIN);

  // Kitchen + bath
  drawKitchen(ctx, KITCHEN_ORIGIN, height, time);
  drawBathroom(ctx, BATH_ORIGIN, height, time, ippolitSpoke, bathed);

  if (!cigarettesGone) {
    drawCigarettePack(ctx, CIGARETTES_X, FLOOR_Y - 14, time);
  }

  for (const c of teaCups) {
    if (!c.taken) drawTeaMug(ctx, c.x, FLOOR_Y - 8);
  }
}

function drawLivingRoom(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  depthCam: number,
  time: number,
): void {
  px(ctx, 0, 0, width, height, P.wallDeep);
  drawTiledWallpaper(ctx, 0, 0, width, FLOOR_Y - 10);
  ditherRect(ctx, 0, 0, width, 8, 'rgba(40, 32, 28, 0.35)', 'rgba(40, 32, 28, 0.05)');

  drawWindow(ctx, depthCam, time);
  drawRedDoor(ctx);
  drawAerialsPoster(ctx);
  drawWallFamilyFrame(ctx);
  drawFloor(ctx, width, height);
  drawBed(ctx);
  drawDeskAndPc(ctx);
  drawComputerJunk(ctx);
  drawDresser(ctx);
  drawBookshelfProp(ctx);
  // No desk lamp / soft bloom above the PC (user request)
  drawBaseboard(ctx, width);
}

function drawRedDoor(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, FLOOR_Y - 86, 22, 76, '#4a1414');
  px(ctx, 2, FLOOR_Y - 84, 18, 72, '#8a2828');
  px(ctx, 3, FLOOR_Y - 82, 16, 2, '#c05050');
  px(ctx, 3, FLOOR_Y - 82, 2, 68, '#a84040');
  px(ctx, 17, FLOOR_Y - 82, 2, 68, '#601818');
  px(ctx, 5, FLOOR_Y - 78, 12, 22, '#782020');
  px(ctx, 6, FLOOR_Y - 77, 10, 2, '#a03838');
  px(ctx, 6, FLOOR_Y - 76, 1, 18, '#903030');
  px(ctx, 5, FLOOR_Y - 50, 12, 28, '#6a1818');
  px(ctx, 6, FLOOR_Y - 49, 10, 2, '#882828');
  speckles(ctx, 4, FLOOR_Y - 80, 14, 60, '#5a1010', 4, 2);
  px(ctx, 10, FLOOR_Y - 58, 4, 4, '#202028');
  px(ctx, 11, FLOOR_Y - 57, 2, 2, '#a0a8b0');
  px(ctx, 11, FLOOR_Y - 57, 1, 1, '#e0e8f0');
  px(ctx, 16, FLOOR_Y - 48, 5, 3, P.brass);
  px(ctx, 17, FLOOR_Y - 47, 3, 1, P.brassHi);
  px(ctx, 18, FLOOR_Y - 46, 1, 1, P.brassDim);
}

function drawComputerJunk(ctx: CanvasRenderingContext2D): void {
  const baseX = 200;
  const fy = FLOOR_Y;
  px(ctx, baseX, fy - 30, 22, 20, '#3a3a48');
  px(ctx, baseX + 1, fy - 29, 20, 2, '#585868');
  px(ctx, baseX + 1, fy - 29, 1, 18, '#505060');
  px(ctx, baseX + 19, fy - 28, 1, 16, '#282830');
  for (let i = 0; i < 4; i++) {
    px(ctx, baseX + 4, fy - 24 + i * 3, 10, 1, '#202028');
    px(ctx, baseX + 4, fy - 23 + i * 3, 10, 1, '#484858');
  }
  px(ctx, baseX + 15, fy - 18, 3, 2, '#40c040');
  px(ctx, baseX + 15, fy - 15, 3, 2, '#c04040');
  px(ctx, baseX + 24, fy - 36, 22, 18, '#2a2a38');
  px(ctx, baseX + 25, fy - 35, 20, 2, '#484858');
  px(ctx, baseX + 26, fy - 33, 18, 11, '#1a2838');
  px(ctx, baseX + 27, fy - 32, 16, 2, '#2a4058');
  px(ctx, baseX + 28, fy - 30, 6, 3, '#406080');
  px(ctx, baseX + 36, fy - 27, 4, 2, '#60a080');
  px(ctx, baseX + 28, fy - 18, 14, 3, '#484858');
  px(ctx, baseX + 30, fy - 17, 4, 1, '#808890');
  px(ctx, baseX + 8, fy - 12, 30, 7, '#204028');
  px(ctx, baseX + 9, fy - 11, 28, 1, '#386040');
  px(ctx, baseX + 10, fy - 10, 3, 3, '#c0a040');
  px(ctx, baseX + 16, fy - 10, 3, 3, '#c0a040');
  px(ctx, baseX + 22, fy - 10, 3, 3, '#808890');
  px(ctx, baseX + 28, fy - 9, 8, 2, '#608070');
  px(ctx, baseX + 46, fy - 16, 16, 8, '#303038');
  px(ctx, baseX + 47, fy - 15, 14, 1, '#505058');
  px(ctx, baseX + 48, fy - 12, 6, 2, '#202028');
  px(ctx, baseX - 6, fy - 10, 12, 2, '#282830');
  px(ctx, baseX - 4, fy - 8, 2, 6, '#383840');
  px(ctx, baseX + 40, fy - 20, 2, 14, '#282830');
  px(ctx, baseX + 42, fy - 12, 10, 2, '#484850');
  px(ctx, baseX + 50, fy - 24, 2, 8, '#202830');
  px(ctx, baseX + 48, fy - 28, 16, 12, '#303040');
  px(ctx, baseX + 49, fy - 27, 14, 2, '#484858');
  px(ctx, baseX + 50, fy - 25, 12, 7, '#182028');
  px(ctx, baseX + 52, fy - 23, 4, 2, '#305060');
}

function drawFloor(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  px(ctx, 0, FLOOR_Y - 10, width, height - (FLOOR_Y - 10), P.floor);
  for (let x = 0; x < width; x += 12) {
    const tone = (x / 12) % 3;
    const col = tone === 0 ? P.floorLight : tone === 1 ? P.floorMid : P.floor;
    woodGrain(
      ctx,
      x,
      FLOOR_Y - 10,
      11,
      height - (FLOOR_Y - 10),
      col,
      P.floorLight,
      P.floorGrain,
      P.floorDark,
      true,
    );
    px(ctx, x + 11, FLOOR_Y - 10, 1, height - (FLOOR_Y - 10), P.floorDark);
    if (tone === 1) px(ctx, x + 4, FLOOR_Y + 14, 3, 1, P.floorLight);
  }
  ctx.fillStyle = P.floorDark;
  for (let x = 6; x < width; x += 12) {
    ctx.fillRect(x, FLOOR_Y + 5, 1, 1);
    ctx.fillRect(x + 3, FLOOR_Y + 16, 1, 1);
  }
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  depthCam = 0,
  time = 0,
): void {
  const fx = 196;
  const fy = 22;
  const fw = 120;
  const fh = 94;
  const gx = fx + 10;
  const gy = fy + 12;
  const gw = fw - 20;
  const gh = fh - 22;

  woodGrain(ctx, fx, fy, fw, fh, P.woodDark, P.woodHi, P.wood, P.woodDeep, false);
  px(ctx, fx + 2, fy + 2, fw - 4, fh - 4, P.wood);
  px(ctx, fx + 4, fy + 4, fw - 8, 2, P.woodHi);
  px(ctx, fx + 4, fy + 4, 2, fh - 10, P.woodHi);
  px(ctx, fx + 4, fy + 6, fw - 8, fh - 12, P.woodDeep);

  px(ctx, gx, gy, gw, gh, P.nightSky);
  ditherRect(ctx, gx, gy, gw, 12, P.nightSky, P.nightSkyMid);
  px(ctx, gx, gy + Math.floor(gh * 0.55), gw, gh - Math.floor(gh * 0.55), P.nightSkyMid);
  ditherRect(ctx, gx + 16, gy + 22, 48, 14, P.nightSkyMid, P.cityHi);

  const ox = Math.round(depthCam * 0.35);
  const blocks = [
    [gx + 4, gy + 24, 16, 40, P.city, P.cityMid],
    [gx + 24, gy + 10, 22, 54, P.cityMid, P.cityHi],
    [gx + 50, gy + 28, 14, 34, P.city, P.cityMid],
    [gx + 68, gy + 14, 18, 48, P.cityMid, P.cityHi],
  ] as const;
  for (const [bx, by, bw, bh, c0, c1] of blocks) {
    px(ctx, bx + ox, by, bw, bh, c0);
    px(ctx, bx + ox + 1, by - 3, bw - 2, 3, c1);
    for (let wy = by + 3; wy < by + bh - 2; wy += 5) {
      for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) {
        px(ctx, wx + ox, wy, 2, 2, ((wx + wy) % 8 === 0 ? P.windowLight : P.windowLightDim));
      }
    }
  }

  drawWindowParade(ctx, { x: gx, y: gy, w: gw, h: gh }, time, depthCam);

  px(ctx, gx + Math.floor(gw / 2) - 1, gy, 3, gh, P.woodMid);
  px(ctx, gx + Math.floor(gw / 2), gy, 1, gh, P.woodHi);
  px(ctx, gx, gy + Math.floor(gh / 2) - 1, gw, 3, P.woodMid);

  const cw = 16;
  px(ctx, fx + 6, fy + 8, cw, fh - 18, P.curtain);
  px(ctx, fx + 8, fy + 12, 3, fh - 26, P.curtainHi);
  px(ctx, fx + 11, fy + 14, 2, fh - 30, P.curtainFold);
  px(ctx, fx + 14, fy + 16, 2, fh - 34, P.curtainDark);
  px(ctx, fx + fw - cw - 6, fy + 8, cw, fh - 18, P.curtain);
  px(ctx, fx + fw - cw - 4, fy + 12, 3, fh - 26, P.curtainHi);
  px(ctx, fx + fw - cw + 1, fy + 14, 2, fh - 30, P.curtainFold);
  px(ctx, fx + fw - cw + 4, fy + 16, 2, fh - 34, P.curtainDark);
  px(ctx, fx + 4, fy + 6, fw - 8, 3, P.woodHi);
}

function drawBaseboard(ctx: CanvasRenderingContext2D, width: number): void {
  px(ctx, 0, FLOOR_Y - 12, width, 2, P.woodDark);
  px(ctx, 0, FLOOR_Y - 14, width, 2, P.wood);
}

function drawDeskAndPc(ctx: CanvasRenderingContext2D): void {
  woodGrain(ctx, 70, FLOOR_Y - 42, 58, 32, P.wood, P.woodHi, P.woodMid, P.woodDark, false);
  px(ctx, 72, FLOOR_Y - 40, 54, 2, P.woodHi);
  px(ctx, 72, FLOOR_Y - 40, 2, 28, P.woodHi);
  px(ctx, 74, FLOOR_Y - 12, 50, 2, P.woodDark);
  px(ctx, 74, FLOOR_Y - 10, 5, 10, P.woodDeep);
  px(ctx, 116, FLOOR_Y - 10, 5, 10, P.woodDeep);

  px(ctx, 78, FLOOR_Y - 70, 28, 26, '#2a2a38');
  px(ctx, 80, FLOOR_Y - 68, 24, 2, '#585868');
  px(ctx, 80, FLOOR_Y - 66, 24, 18, '#102028');
  px(ctx, 82, FLOOR_Y - 64, 20, 2, '#204040');
  px(ctx, 82, FLOOR_Y - 62, 8, 3, '#408060');
  px(ctx, 82, FLOOR_Y - 58, 14, 2, '#306050');
  px(ctx, 82, FLOOR_Y - 54, 10, 2, '#284838');
  px(ctx, 84, FLOOR_Y - 52, 12, 1, '#183030');
  px(ctx, 86, FLOOR_Y - 44, 12, 4, '#484858');
  px(ctx, 88, FLOOR_Y - 43, 4, 1, '#808890');

  px(ctx, 78, FLOOR_Y - 46, 30, 5, '#3a3a48');
  px(ctx, 80, FLOOR_Y - 45, 26, 1, '#585868');
  for (let kx = 81; kx < 104; kx += 3) px(ctx, kx, FLOOR_Y - 44, 2, 1, '#686878');

  px(ctx, 108, FLOOR_Y - 38, 14, 26, '#303040');
  px(ctx, 110, FLOOR_Y - 36, 10, 2, '#505060');
  px(ctx, 110, FLOOR_Y - 33, 10, 4, '#202028');
  px(ctx, 112, FLOOR_Y - 28, 3, 2, '#40a040');
  px(ctx, 112, FLOOR_Y - 24, 3, 2, '#a04040');
  px(ctx, 110, FLOOR_Y - 18, 8, 1, '#484858');
}

function drawDresser(ctx: CanvasRenderingContext2D): void {
  woodGrain(ctx, 244, FLOOR_Y - 54, 58, 44, P.wood, P.woodHi, P.woodMid, P.woodDark, true);
  px(ctx, 246, FLOOR_Y - 52, 54, 2, P.woodHi);
  px(ctx, 246, FLOOR_Y - 52, 2, 40, P.woodHi);
  px(ctx, 298, FLOOR_Y - 52, 2, 40, P.woodDark);

  const rows = [FLOOR_Y - 46, FLOOR_Y - 34, FLOOR_Y - 22];
  for (const ry of rows) {
    px(ctx, 248, ry, 50, 10, P.woodDark);
    px(ctx, 250, ry + 1, 46, 8, P.wood);
    px(ctx, 252, ry + 2, 42, 1, P.woodHi);
    speckles(ctx, 250, ry + 1, 46, 8, P.woodKnot, 5, ry);
    px(ctx, 266, ry + 4, 12, 3, P.brass);
    px(ctx, 268, ry + 4, 8, 1, P.brassHi);
    px(ctx, 270, ry + 5, 4, 1, P.brassDim);
  }
}

function drawBed(ctx: CanvasRenderingContext2D): void {
  woodGrain(ctx, 8, FLOOR_Y - 24, 68, 14, P.woodDark, P.woodHi, P.wood, P.woodDeep, false);
  px(ctx, 10, FLOOR_Y - 22, 64, 2, P.woodHi);
  px(ctx, 8, FLOOR_Y - 10, 68, 6, P.wood);
  px(ctx, 12, FLOOR_Y - 30, 60, 8, P.bedSheet);
  px(ctx, 14, FLOOR_Y - 29, 56, 1, P.bedSheetHi);
  px(ctx, 30, FLOOR_Y - 34, 42, 10, P.bedBlanket);
  px(ctx, 32, FLOOR_Y - 32, 38, 2, P.bedBlanketHi);
  px(ctx, 34, FLOOR_Y - 28, 34, 1, P.bedBlanketDark);
  speckles(ctx, 30, FLOOR_Y - 34, 42, 10, P.bedBlanketDark, 4, 1);
  px(ctx, 12, FLOOR_Y - 38, 20, 10, P.pillow);
  px(ctx, 14, FLOOR_Y - 36, 16, 3, P.pillowHi);
  px(ctx, 16, FLOOR_Y - 32, 12, 2, P.pillowShadow);
  px(ctx, 8, FLOOR_Y - 46, 6, 24, P.wood);
  px(ctx, 9, FLOOR_Y - 44, 1, 20, P.woodHi);
}

function drawCatAt(ctx: CanvasRenderingContext2D, worldX: number, time: number): void {
  const C = CAT_PAL;
  const bob = Math.floor(time * 2) % 2;
  const x = worldX;
  const y = FLOOR_Y - 10 + bob;

  px(ctx, x, y - 11, 15, 9, C.fur);
  px(ctx, x + 1, y - 10, 13, 2, C.furHi);
  px(ctx, x + 2, y - 7, 11, 3, C.furMid);
  px(ctx, x + 3, y - 5, 9, 2, C.belly);
  speckles(ctx, x, y - 11, 15, 9, C.furDark, 3, 1);
  px(ctx, x + 3, y - 9, 2, 1, C.stripe);
  px(ctx, x + 7, y - 8, 2, 1, C.stripe);
  px(ctx, x + 11, y - 9, 2, 1, C.stripe);
  px(ctx, x + 5, y - 6, 2, 1, C.stripe);

  px(ctx, x + 10, y - 18, 9, 8, C.fur);
  px(ctx, x + 11, y - 17, 7, 2, C.furHi);
  px(ctx, x + 12, y - 14, 5, 2, C.furMid);
  px(ctx, x + 10, y - 22, 3, 4, C.fur);
  px(ctx, x + 11, y - 21, 1, 2, C.innerEar);
  px(ctx, x + 16, y - 22, 3, 4, C.fur);
  px(ctx, x + 17, y - 21, 1, 2, C.innerEar);
  px(ctx, x + 10, y - 22, 1, 1, C.outline);
  px(ctx, x + 18, y - 22, 1, 1, C.outline);
  px(ctx, x + 12, y - 15, 2, 2, C.eye);
  px(ctx, x + 16, y - 15, 2, 2, C.eye);
  px(ctx, x + 12, y - 15, 1, 1, C.eyeHi);
  px(ctx, x + 16, y - 15, 1, 1, C.eyeHi);
  px(ctx, x + 14, y - 13, 2, 1, C.nose);
  px(ctx, x + 14, y - 13, 1, 1, C.noseHi);
  px(ctx, x + 13, y - 12, 1, 1, C.outline);
  px(ctx, x + 16, y - 12, 1, 1, C.outline);
  px(ctx, x + 10, y - 13, 3, 1, C.whisker);
  px(ctx, x + 17, y - 13, 3, 1, C.whisker);
  px(ctx, x + 10, y - 12, 2, 1, C.whisker);
  px(ctx, x + 18, y - 12, 2, 1, C.whisker);

  px(ctx, x - 5, y - 13, 6, 2, C.fur);
  px(ctx, x - 6, y - 18, 2, 6, C.furMid);
  px(ctx, x - 5, y - 19, 2, 2, C.furHi);
  px(ctx, x - 6, y - 16, 1, 1, C.stripe);
  px(ctx, x + 2, y - 3, 3, 2, C.furHi);
  px(ctx, x + 8, y - 3, 3, 2, C.furHi);
}

function drawHotspotHints(
  ctx: CanvasRenderingContext2D,
  states: StateManager,
  teaCups: TeaCup[],
  timeSec: number,
  playerX: number,
  clock: HotspotHintClock,
  opts: { cigarettesGone: boolean; flushBusy: boolean },
): void {
  if (!states.flags.introDone) return;

  const nearShelf =
    playerX >= BOOKSHELF_X &&
    playerX <= BOOKSHELF_X + BOOKSHELF_W &&
    (states.flags.level9Cleared ||
      states.flags.level11Cleared ||
      states.flags.level12Cleared);
  const shelf = clock.sample('bookshelf', nearShelf, timeSec);
  if (shelf.active) {
    drawInteractPrompt(ctx, BOOKSHELF_X + BOOKSHELF_W / 2, FLOOR_Y - 58, 'Читальня', timeSec, {
      size: 5.5,
      showLabel: shelf.showLabel,
    });
  }

  const nearDress = playerX >= DRESSER_X && playerX <= DRESSER_X + DRESSER_W;
  const dresser = clock.sample('dresser', nearDress, timeSec);
  if (dresser.active) {
    const label = states.flags.diaryUnlocked ? 'Открыть дневник' : 'Открыть комод';
    drawInteractPrompt(ctx, DRESSER_X + DRESSER_W / 2, FLOOR_Y - 58, label, timeSec, {
      size: 5.5,
      showLabel: dresser.showLabel,
    });
  }

  const chainNear = Math.abs(playerX - CHAIN_X) < 22 && !opts.flushBusy;
  const chain = clock.sample('chain', chainNear, timeSec);
  if (chain.active) {
    drawInteractPrompt(ctx, CHAIN_X, FLOOR_Y - 70, 'Дёрнуть цепочку', timeSec, {
      size: 5.5,
      showLabel: chain.showLabel,
    });
  }

  const litterNear =
    Math.abs(playerX - LITTER_X) < 22 &&
    states.flags.level1Cleared &&
    !states.flags.litterCleaned;
  const litter = clock.sample('litter', litterNear, timeSec);
  if (litter.active) {
    drawInteractPrompt(ctx, LITTER_X, FLOOR_Y - 28, 'Почистить лоток', timeSec, {
      size: 5.5,
      showLabel: litter.showLabel,
    });
  }

  const cigNear = !opts.cigarettesGone && Math.abs(playerX - CIGARETTES_X) < 22;
  const cig = clock.sample('cigs', cigNear, timeSec);
  if (cig.active) {
    drawInteractPrompt(ctx, CIGARETTES_X, FLOOR_Y - 30, 'Взять сигареты', timeSec, {
      size: 5.5,
      showLabel: cig.showLabel,
    });
  }

  const washNear =
    Math.abs(playerX - TUB_X) < 32 &&
    states.flags.level2Cleared &&
    !states.flags.bathed;
  const wash = clock.sample('wash', washNear, timeSec);
  if (wash.active) {
    drawInteractPrompt(ctx, TUB_X, FLOOR_Y - 56, 'Помыться', timeSec, {
      size: 5.5,
      showLabel: wash.showLabel,
    });
  } else {
    const ipNear = Math.abs(playerX - IPPOLIT_X) < 28;
    const ip = clock.sample('ippolit', ipNear && !washNear, timeSec);
    if (ip.active) {
      drawInteractPrompt(ctx, IPPOLIT_X, FLOOR_Y - 56, 'Поговорить', timeSec, {
        size: 5.5,
        showLabel: ip.showLabel,
      });
    }
  }

  for (let i = 0; i < teaCups.length; i++) {
    const c = teaCups[i]!;
    if (c.taken) {
      clock.sample(`beer-${i}`, false, timeSec);
      continue;
    }
    const near = Math.abs(playerX - c.x) < 18;
    const hint = clock.sample(`beer-${i}`, near, timeSec);
    if (!hint.active) continue;
    drawInteractPrompt(ctx, c.x, FLOOR_Y - 22, 'Взять ПИВО', timeSec, {
      size: 5.5,
      showLabel: hint.showLabel,
    });
  }
}

function drawPromptBar(ctx: CanvasRenderingContext2D, width: number, text: string): void {
  const tw = measureUiText(ctx, text, 7, 550);
  const bw = Math.min(width - 8, tw + 14);
  uiPanel(
    ctx,
    Math.round((width - bw) / 2),
    PROMPT_Y - 11,
    bw,
    13,
    'rgba(10,12,18,0.78)',
    'rgba(200,168,80,0.55)',
  );
  drawUiTextCentered(ctx, text, width / 2, PROMPT_Y - 8, P.uiText, 7, 550);
}

function drawPhotoOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(6, 6, 12, 0.88)';
  ctx.fillRect(0, 0, width, height);

  const bx = 48;
  const by = 18;
  const bw = 224;
  const bh = 148;
  segaBox(ctx, bx - 4, by - 4, bw + 8, bh + 8, P.frame, P.frameDark, {
    borderDark: P.woodDeep,
    inset: false,
  });
  px(ctx, bx, by, bw, bh, '#1a1410');

  const photoH = bh - 28;
  const drawn = drawFamilyPhotoFace(ctx, bx + 2, by + 2, bw - 4, photoH - 2);
  if (!drawn) {
    px(ctx, bx + 2, by + 2, bw - 4, photoH - 2, '#88b070');
  }

  px(ctx, bx, by + bh - 26, bw, 26, '#b09870');
  drawUiTextCentered(ctx, 'Счастливая семья', width / 2, by + bh - 18, '#3a2a18', 8, 650);
  drawUiTextCentered(ctx, 'Год 1995 — мы были вместе', width / 2, by + bh - 8, '#4a3828', 6, 550);
  drawUiTextCentered(ctx, 'E / Enter — дальше', width / 2, height - 14, P.uiText, 7, 550);
}

function drawToast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
): void {
  const label = text;
  const tw = measureUiText(ctx, label, 8, 600);
  const bw = Math.min(width - 24, tw + 20);
  const bx = Math.round((width - bw) / 2);
  const by = Math.round(height / 2 - 12);
  uiPanel(ctx, bx, by, bw, 22, 'rgba(12,14,20,0.9)', 'rgba(200,168,80,0.75)');
  drawUiTextCentered(ctx, label, width / 2, by + 6, P.uiText, 8, 600);
}

function drawDiarySelect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cursor: number,
  scroll: number,
  flags: ProgressFlags,
): void {
  ctx.fillStyle = 'rgba(6, 4, 10, 0.9)';
  ctx.fillRect(0, 0, width, height);

  const bx = 16;
  const by = 6;
  const bw = width - 32;
  const bh = height - 12;
  segaBox(ctx, bx, by, bw, bh, '#2a1810', P.brass, { borderDark: P.brassDim });
  px(ctx, bx + 4, by + 4, bw - 8, bh - 8, '#5a3a20');
  px(ctx, bx + 6, by + 6, bw - 12, 2, '#7a5a38');

  drawUiTextCentered(ctx, 'Дневник — уровни', width / 2 - 10, by + 8, P.diaryPages, 8, 650);

  const thumbX = bx + bw - 34;
  const thumbY = by + 4;
  px(ctx, thumbX, thumbY, 22, 16, P.frameDark);
  px(ctx, thumbX + 1, thumbY + 1, 20, 14, P.frame);
  if (!drawFamilyPhotoFace(ctx, thumbX + 2, thumbY + 2, 18, 12)) {
    px(ctx, thumbX + 2, thumbY + 2, 18, 12, '#88b070');
  }

  // Year strip: 1995 → 2015 → сейчас
  const stripY = by + 26;
  const stripLabels = YEAR_STRIP;
  const stripW = bw - 40;
  const stripX0 = bx + 14;
  px(ctx, stripX0, stripY + 6, stripW, 1, '#8a6a48');
  for (let i = 0; i < stripLabels.length; i++) {
    const frac = stripLabels.length === 1 ? 0.5 : i / (stripLabels.length - 1);
    const nx = Math.round(stripX0 + frac * stripW);
    const activeYear = levelYearKey(LEVELS[cursor]!);
    const on = stripLabels[i]!.yearKey === activeYear;
    px(ctx, nx - 2, stripY + 4, 5, 5, on ? P.brassHi : '#6a5a48');
    drawUiTextCentered(
      ctx,
      stripLabels[i]!.label,
      nx,
      stripY - 2,
      on ? P.brassHi : '#8a7a68',
      5.5,
      on ? 650 : 500,
    );
  }
  // Level nodes on strip (dim locked)
  for (const lvl of LEVELS) {
    const years = stripLabels.map((s) => s.yearKey);
    const yk = levelYearKey(lvl);
    const yi = Math.max(0, years.indexOf(yk));
    const frac = years.length === 1 ? 0.5 : yi / (years.length - 1);
    // offset within same year bucket
    const same = LEVELS.filter((l) => levelYearKey(l) === yk);
    const si = same.findIndex((l) => l.id === lvl.id);
    const jitter = (si - (same.length - 1) / 2) * 10;
    const nx = Math.round(stripX0 + frac * stripW + jitter);
    const unlocked =
      lvl.id === 1 || !!flags[`level${lvl.id - 1}Cleared` as keyof ProgressFlags];
    const cleared = !!flags[`level${lvl.id}Cleared` as keyof ProgressFlags];
    const selected = lvl.id - 1 === cursor;
    const col = !unlocked ? '#4a3a30' : selected ? P.brassHi : cleared ? '#90b070' : '#c0a878';
    px(ctx, nx - 1, stripY + 10, 3, 3, col);
  }

  px(ctx, bx + 14, stripY + 18, bw - 28, 1, '#8a6a48');

  const VISIBLE = 6;
  const rowH = 18;
  const listTop = stripY + 22;
  const start = Math.max(0, Math.min(scroll, LEVELS.length - VISIBLE));
  const slice = LEVELS.slice(start, start + VISIBLE);

  slice.forEach((lvl, row) => {
    const i = start + row;
    const unlocked =
      lvl.id === 1 || !!flags[`level${lvl.id - 1}Cleared` as keyof ProgressFlags];
    const cleared = !!flags[`level${lvl.id}Cleared` as keyof ProgressFlags];
    const locked = !unlocked;
    const ly = listTop + row * rowH;
    const selected = !locked && i === cursor;
    if (selected) {
      segaBox(ctx, bx + 8, ly - 2, bw - 16, 17, '#3a2818', P.brass, {
        borderDark: P.brassDim,
        inset: false,
      });
    }
    const title = locked
      ? `Ур. ${lvl.id} — ???`
      : `Ур. ${lvl.id} — ${lvl.title}`;
    const sub = locked
      ? `Закрыт — пройди ур. ${lvl.id - 1}`
      : cleared
        ? 'Пройден — повтор'
        : lvl.subtitle;
    const titleColor = locked ? '#6a5a50' : selected ? P.brassHi : P.diaryPages;
    const dim = locked ? 0.55 : 1;
    ctx.save();
    ctx.globalAlpha = dim;
    drawUiText(ctx, `${selected ? '›' : ' '} ${title}`, bx + 12, ly, titleColor, 6.5, 600);
    drawUiText(ctx, sub, bx + 24, ly + 8, locked ? '#5a4a40' : '#a09080', 5.5, 500);
    ctx.restore();
  });

  // Scroll cues (ASCII — font has no triangle glyphs)
  if (start > 0) {
    drawUiTextCentered(ctx, '^', width / 2, listTop - 2, '#a09080', 5, 500);
  }
  if (start + VISIBLE < LEVELS.length) {
    drawUiTextCentered(ctx, 'v', width / 2, by + bh - 20, '#a09080', 5, 500);
  }

  const hint = `Enter / E — ур. ${cursor + 1}`;
  drawUiTextCentered(ctx, hint, width / 2, by + bh - 10, P.uiText, 6.5, 550);
}


function drawBookshelfProp(ctx: CanvasRenderingContext2D): void {
  const x = BOOKSHELF_X;
  const y = FLOOR_Y - 52;
  segaBox(ctx, x, y, BOOKSHELF_W, 52, '#3a2a18', '#8a6a40', { borderDark: '#2a1a10' });
  for (let i = 0; i < 4; i++) {
    px(ctx, x + 3 + i * 8, y + 6, 6, 14, ['#6a3040', '#304060', '#406040', '#604030'][i]!);
  }
  for (let i = 0; i < 4; i++) {
    px(ctx, x + 3 + i * 8, y + 28, 6, 14, ['#405060', '#603040', '#305040', '#504030'][i]!);
  }
}

function drawChitalnya(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cursor: number,
  flags: ProgressFlags,
  active: ChitalnyaThemeId | null,
): void {
  ctx.fillStyle = 'rgba(6, 8, 14, 0.9)';
  ctx.fillRect(0, 0, width, height);
  segaBox(ctx, 24, 20, width - 48, height - 40, '#243040', '#8090a8', { borderDark: '#405060' });
  drawUiTextCentered(ctx, 'Читальня', width / 2, 32, '#e8e0d0', 9, 700);
  drawUiTextCentered(ctx, 'Свободный квиз по темам', width / 2, 48, '#a0b0c0', 6, 500);

  const unlocked = CHITALNYA_THEMES.filter((th) => chitalnyaThemeUnlocked(th, flags));
  if (unlocked.length === 0) {
    drawUiTextCentered(ctx, 'Пока закрыто — пройди ур. 9+', width / 2, 100, '#c0a090', 7, 550);
    drawUiTextCentered(ctx, 'E / K — назад', width / 2, height - 36, '#8090a0', 6, 500);
    return;
  }

  CHITALNYA_THEMES.forEach((th, i) => {
    const ok = chitalnyaThemeUnlocked(th, flags);
    const ly = 70 + i * 28;
    const sel = ok && unlocked.indexOf(th) === cursor && active === null;
    if (sel) {
      segaBox(ctx, 40, ly - 4, width - 80, 24, '#304858', '#c8b878', {
        borderDark: '#506878',
        inset: false,
      });
    }
    const title = ok ? th.title : `${th.title} · закрыто`;
    drawUiText(ctx, `${sel ? '>' : ' '} ${title}`, 48, ly, ok ? (sel ? '#e8d090' : '#d0d8e0') : '#607080', 7, 600);
    drawUiText(ctx, ok ? `${th.bank.length} вопросов` : `после ур. ${th.unlockAfterLevel}`, 48, ly + 12, '#8090a0', 5.5, 500);
  });

  if (active) {
    drawUiTextCentered(ctx, 'Отвечай 1–4 · H подсказка · K к темам', width / 2, height - 36, '#c0d0e0', 6, 500);
  } else {
    drawUiTextCentered(ctx, 'Enter — тема · K — назад', width / 2, height - 36, '#c0d0e0', 6, 500);
  }
}
