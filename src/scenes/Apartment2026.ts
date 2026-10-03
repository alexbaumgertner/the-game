/**
 * ERA_2026 — хрущёвка Зуича (Зелинского 2).
 * Туалет ← комната → кухня → ванная.
 * Интро: комп → кошка → комод → дневник 1995.
 * Квесты: сигареты; после L1 — лоток; после L2 — помыться.
 * Пиво: pickups + BeerSystem (жажда параллельно).
 */

import type { SceneContext, StateManager } from '@/core/StateManager';
import { ART_SCALE, LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { BeerSystem } from '@/systems/BeerSystem';
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
  drawBeerCan,
  drawCigarettePack,
  drawDoorwayArch,
  drawKitchen,
  drawRoomBottles,
  drawToiletRoom,
  preloadIppolitFace,
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

const WIDTH = LOGICAL_WIDTH;
const FLOOR_Y = APT_FLOOR_Y;
const PROMPT_Y = 210;
const P = APT_PAL;
/** Desk / PC seat X (living room). */
const DESK_X = ROOM_ORIGIN + 92;
/** Dresser (комод) hotspot. */
const DRESSER_X = ROOM_ORIGIN + 236;
const DRESSER_W = 70;

interface BeerCan {
  x: number;
  taken: boolean;
}

export type OverlayMode = 'none' | 'photo' | 'toast' | 'diary';

export interface ApartmentSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: BeerSystem;
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
      text: 'Зелинского 2… 2026. Рынок, сестрёнка, семёрка через мост — всё это было.',
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
  let prompt = 'ИССЛЕДУЙ КВАРТИРУ';
  let time = 0;
  let camX = ROOM_ORIGIN;
  let depthCam = 0;
  const stack = new ParallaxStack();
  const dialogue = new DialogueSystem();
  let introStarted = false;
  let beerCans: BeerCan[] = [];
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
    if (!states.flags.level1Cleared) {
      prompt = 'ДНЕВНИК - ВЫБОР УРОВНЯ';
      hud.set({ objective: 'Дневник - ур. 1' });
    } else if (!states.flags.level2Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 2 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 2' });
    } else if (!states.flags.level3Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 3 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 3' });
    } else if (!states.flags.level4Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 4 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 4' });
    } else if (!states.flags.level5Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 5 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 5' });
    } else if (!states.flags.level6Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 6 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 6' });
    } else if (!states.flags.level7Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 7 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 7' });
    } else if (!states.flags.level8Cleared) {
      prompt = 'ДНЕВНИК - УРОВЕНЬ 8 ГОТОВ';
      hud.set({ objective: 'Дневник - ур. 8' });
    } else {
      prompt = 'ДНЕВНИК - ВОСПОМИНАНИЯ';
      hud.set({ objective: 'Дневник - повтор' });
    }
  };

  const nearDresser = (): boolean =>
    player.x >= DRESSER_X && player.x <= DRESSER_X + DRESSER_W;

  const nearBeer = (): BeerCan | null => {
    for (const c of beerCans) {
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
    const can = nearBeer();
    if (can) return 'Взять пиво';
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
    if (overlay === 'diary') return;

    if (!states.flags.introDone) return;

    const can = nearBeer();
    if (can) {
      player.beginInspect(0.35);
      can.taken = true;
      beer.pickup(1);
      showToast('Банка пива.');
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
    if (dialogue.isOpen || overlay === 'diary' || overlay === 'photo') return;
    if (beer.drink()) {
      showToast('Бухло принято.');
    } else if (beer.cans <= 0) {
      showToast('Нет пива. Ищи банки.');
    }
  };

  const level2Unlocked = (): boolean => states.flags.level1Cleared;
  const level3Unlocked = (): boolean => states.flags.level2Cleared;
  const level4Unlocked = (): boolean => states.flags.level3Cleared;
  const level5Unlocked = (): boolean => states.flags.level4Cleared;
  const level6Unlocked = (): boolean => states.flags.level5Cleared;
  const level7Unlocked = (): boolean => states.flags.level6Cleared;
  const level8Unlocked = (): boolean => states.flags.level7Cleared;

  const maxDiaryCursor = (): number => {
    if (level8Unlocked()) return 7;
    if (level7Unlocked()) return 6;
    if (level6Unlocked()) return 5;
    if (level5Unlocked()) return 4;
    if (level4Unlocked()) return 3;
    if (level3Unlocked()) return 2;
    if (level2Unlocked()) return 1;
    return 0;
  };

  const nextDiaryCursor = (): number => {
    if (!states.flags.level1Cleared) return 0;
    if (!states.flags.level2Cleared) return 1;
    if (!states.flags.level3Cleared) return 2;
    if (!states.flags.level4Cleared) return 3;
    if (!states.flags.level5Cleared) return 4;
    if (!states.flags.level6Cleared) return 5;
    if (!states.flags.level7Cleared) return 6;
    if (!states.flags.level8Cleared) return 7;
    return 0;
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

    if (input.justPressed('confirm') || input.justPressed('interact')) {
      if (diaryCursor === 0) {
        states.setFlag('level1Selected', true);
        overlay = 'none';
        states.goto('rynok_1995', { era: 'ERA_1995', data: { level: 1 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 1 && level2Unlocked()) {
        states.setFlag('level2Selected', true);
        overlay = 'none';
        states.goto('podezd_1995', { era: 'ERA_1995', data: { level: 2 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 2 && level3Unlocked()) {
        states.setFlag('level3Selected', true);
        overlay = 'none';
        states.goto('vokzal_1995', { era: 'ERA_1995', data: { level: 3 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 3 && level4Unlocked()) {
        states.setFlag('level4Selected', true);
        overlay = 'none';
        states.goto('garazhi_1995', { era: 'ERA_1995', data: { level: 4 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 4 && level5Unlocked()) {
        states.setFlag('level5Selected', true);
        overlay = 'none';
        states.goto('dvor_1995', { era: 'ERA_1995', data: { level: 5 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 5 && level6Unlocked()) {
        states.setFlag('level6Selected', true);
        overlay = 'none';
        states.goto('most_1995', { era: 'ERA_1995', data: { level: 6 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 6 && level7Unlocked()) {
        states.setFlag('level7Selected', true);
        overlay = 'none';
        states.goto('diskoteka_1995', { era: 'ERA_1995', data: { level: 7 }, fadeSeconds: 0.55 });
        return;
      }
      if (diaryCursor === 7 && level8Unlocked()) {
        states.setFlag('level8Selected', true);
        overlay = 'none';
        states.goto('detinets_1995', { era: 'ERA_1995', data: { level: 8 }, fadeSeconds: 0.55 });
      }
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
      beerCans = [
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
      const axis = frozen ? 0 : (states.input?.axisX() ?? 0);
      if (states.flags.introDone) {
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
              beerCans,
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
              drawHotspotHints(c, states, beerCans, time, player.x, hotspotHints, {
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
              ART_SCALE,
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
        drawDiarySelect(ctx, width, height, diaryCursor, {
          level1Cleared: states.flags.level1Cleared,
          level2Cleared: states.flags.level2Cleared,
          level3Cleared: states.flags.level3Cleared,
          level4Cleared: states.flags.level4Cleared,
          level5Cleared: states.flags.level5Cleared,
          level6Cleared: states.flags.level6Cleared,
          level7Cleared: states.flags.level7Cleared,
          level8Cleared: states.flags.level8Cleared,
        });
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
  beerCans: BeerCan[],
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
  drawRoomBottles(ctx, ROOM_ORIGIN);

  // Kitchen + bath
  drawKitchen(ctx, KITCHEN_ORIGIN, height, time);
  drawBathroom(ctx, BATH_ORIGIN, height, time, ippolitSpoke, bathed);

  if (!cigarettesGone) {
    drawCigarettePack(ctx, CIGARETTES_X, FLOOR_Y - 14, time);
  }

  for (const c of beerCans) {
    if (!c.taken) drawBeerCan(ctx, c.x, FLOOR_Y - 8);
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
  beerCans: BeerCan[],
  timeSec: number,
  playerX: number,
  clock: HotspotHintClock,
  opts: { cigarettesGone: boolean; flushBusy: boolean },
): void {
  if (!states.flags.introDone) return;

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

  for (let i = 0; i < beerCans.length; i++) {
    const c = beerCans[i]!;
    if (c.taken) {
      clock.sample(`beer-${i}`, false, timeSec);
      continue;
    }
    const near = Math.abs(playerX - c.x) < 18;
    const hint = clock.sample(`beer-${i}`, near, timeSec);
    if (!hint.active) continue;
    drawInteractPrompt(ctx, c.x, FLOOR_Y - 22, 'Взять пиво', timeSec, {
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
  progress: {
    level1Cleared: boolean;
    level2Cleared: boolean;
    level3Cleared: boolean;
    level4Cleared: boolean;
    level5Cleared: boolean;
    level6Cleared: boolean;
    level7Cleared: boolean;
    level8Cleared: boolean;
  },
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

  drawUiTextCentered(ctx, 'Дневник — уровни', width / 2, by + 8, P.diaryPages, 8, 650);

  const thumbX = bx + bw - 40;
  const thumbY = by + 6;
  px(ctx, thumbX, thumbY, 26, 20, P.frameDark);
  px(ctx, thumbX + 1, thumbY + 1, 24, 18, P.frame);
  if (!drawFamilyPhotoFace(ctx, thumbX + 2, thumbY + 2, 22, 16)) {
    px(ctx, thumbX + 2, thumbY + 2, 22, 16, '#88b070');
  }

  px(ctx, bx + 14, by + 28, bw - 28, 1, '#8a6a48');

  const levels = [
    {
      title: 'Ур. 1 — Рынок · рюкзак',
      sub: progress.level1Cleared ? 'Пройден — повтор' : 'Сестрёнка · автобус',
      locked: false,
    },
    {
      title: progress.level1Cleared ? 'Ур. 2 — Выпускной' : 'Ур. 2 — ???',
      sub: !progress.level1Cleared
        ? 'Закрыт — пройди ур. 1'
        : progress.level2Cleared
          ? 'Пройден — повтор'
          : 'Разговор с отцом',
      locked: !progress.level1Cleared,
    },
    {
      title: progress.level2Cleared ? 'Ур. 3 — Вокзал' : 'Ур. 3 — ???',
      sub: !progress.level2Cleared
        ? 'Закрыт — пройди ур. 2'
        : progress.level3Cleared
          ? 'Пройден — повтор'
          : 'Зима 1995',
      locked: !progress.level2Cleared,
    },
    {
      title: progress.level3Cleared ? 'Ур. 4 — Гаражи' : 'Ур. 4 — ???',
      sub: !progress.level3Cleared
        ? 'Закрыт — пройди ур. 3'
        : progress.level4Cleared
          ? 'Пройден — повтор'
          : 'Зима 1995',
      locked: !progress.level3Cleared,
    },
    {
      title: progress.level4Cleared ? 'Ур. 5 — Двор / крыша' : 'Ур. 5 — ???',
      sub: !progress.level4Cleared
        ? 'Закрыт — пройди ур. 4'
        : progress.level5Cleared
          ? 'Пройден — повтор'
          : 'Финал блока',
      locked: !progress.level4Cleared,
    },
    {
      title: progress.level5Cleared ? 'Ур. 6 — Мост / Волхов' : 'Ур. 6 — ???',
      sub: !progress.level5Cleared
        ? 'Закрыт — пройди ур. 5'
        : progress.level6Cleared
          ? 'Пройден — повтор'
          : 'Зима 1995',
      locked: !progress.level5Cleared,
    },
    {
      title: progress.level6Cleared ? 'Ур. 7 — Дискотека «Орбита»' : 'Ур. 7 — ???',
      sub: !progress.level6Cleared
        ? 'Закрыт — пройди ур. 6'
        : progress.level7Cleared
          ? 'Пройден — повтор'
          : 'Зима 1995',
      locked: !progress.level6Cleared,
    },
    {
      title: progress.level7Cleared ? 'Ур. 8 — Детинец' : 'Ур. 8 — ???',
      sub: !progress.level7Cleared
        ? 'Закрыт — пройди ур. 7'
        : progress.level8Cleared
          ? 'Пройден — повтор'
          : 'Финал зимы',
      locked: !progress.level7Cleared,
    },
  ];

  const rowH = 19;
  levels.forEach((lvl, i) => {
    const ly = by + 32 + i * rowH;
    const selected = !lvl.locked && i === cursor;
    if (selected) {
      segaBox(ctx, bx + 8, ly - 2, bw - 16, 18, '#3a2818', P.brass, {
        borderDark: P.brassDim,
        inset: false,
      });
    }
    const titleColor = lvl.locked ? '#6a5a50' : selected ? P.brassHi : P.diaryPages;
    drawUiText(ctx, `${selected ? '›' : ' '} ${lvl.title}`, bx + 12, ly, titleColor, 6.5, 600);
    drawUiText(ctx, lvl.sub, bx + 24, ly + 8, lvl.locked ? '#5a4a40' : '#a09080', 5.5, 500);
  });

  const hints = [
    'Enter / E — начать ур. 1',
    'Enter / E — начать ур. 2',
    'Enter / E — начать ур. 3',
    'Enter / E — начать ур. 4',
    'Enter / E — начать ур. 5',
    'Enter / E — начать ур. 6',
    'Enter / E — начать ур. 7',
    'Enter / E — начать ур. 8',
  ];
  const hint = hints[cursor] ?? hints[0]!;
  drawUiTextCentered(ctx, hint, width / 2, by + bh - 12, P.uiText, 6.5, 550);
}
