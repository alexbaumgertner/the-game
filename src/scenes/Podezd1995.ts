import { audio } from '@/audio';
/**
 * ERA_1995 — Level 2 “Выпускной / разговор с отцом”.
 * Apartment memory → hard talk with father → pedagogy quiz (Пиаже, Выготский…).
 * No fighting. Wrong/hint = 14 MF (gangster punch).
 */

import type { StateManager } from '@/core/StateManager';
import { LOGICAL_WIDTH } from '@/core/Display';
import { MAX_FORTITUDE, type Player } from '@/entities/Player';
import type { HUD } from '@/ui/HUD';
import type { TeaSystem } from '@/systems/TeaSystem';
import { APT_PAL } from '@/art/segaPalette';
import { preloadApartmentPhotos } from '@/art/apartmentPhotos';
import { drawMdWallpaper } from '@/art/mdTiles';
import {
  drawFatherRoomWallPhotos,
  preloadFatherRoomPhotos,
} from '@/art/fatherRoomPhotos';
import { drawFatherTv, preloadFatherTv } from '@/art/fatherTv';
import { drawFamilyFaceWithRim, preloadFamilyFaces } from '@/art/familyFaces';
import { ditherRect, px, speckles } from '@/art/pixelDraw';
import {
  drawUiText,
  drawUiTextCentered,
  measureUiText,
  uiPanel,
} from '@/art/uiFont';
import { DialogueSystem } from '@/systems/DialogueSystem';
import { QuizSystem, QUIZ_MF_COST, quizHudHint } from '@/systems/QuizSystem';
import {
  FATHER_TALK_SCRIPT,
  GRADUATION_QUESTIONS,
} from '@/data/graduationNarrative';

const P = APT_PAL;
const FLOOR_Y = 188;
const WIDTH = LOGICAL_WIDTH;
const FATHER_X = 240;

type Phase = 'walk' | 'talk' | 'quiz' | 'cleared' | 'gameover';

export interface PodezdSceneDeps {
  states: StateManager;
  player: Player;
  hud: HUD;
  beer: TeaSystem;
}

export function createPodezd1995Scene(deps: PodezdSceneDeps) {
  const { states, player, hud, beer } = deps;

  let phase: Phase = 'walk';
  let toast = '';
  let toastTimer = 0;
  let time = 0;
  let winTimer = 0;
  let gameOverTimer = 0;
  let quizIndex = 0;
  let quizDone = 0;
  const NEED_CORRECT = GRADUATION_QUESTIONS.length;
  const dialogue = new DialogueSystem();
  const quiz = new QuizSystem();

  const syncHud = (objective?: string): void => {
    hud.set({
      hp: player.hp,
      maxHp: MAX_FORTITUDE,
      fortitude: player.mentalFortitude,
      maxFortitude: MAX_FORTITUDE,
      swagger: 0,
      maxSwagger: 100,
      showSwagger: false,
      eraLabel: 'ЗУИЧ · 1995',
      levelTitle: 'Выпускной',
      objective:
        objective ??
        (phase === 'walk'
          ? 'Подойди к отцу'
          : phase === 'talk'
            ? 'Разговор с отцом'
            : phase === 'quiz'
              ? `Вопросы ${quizDone}/${NEED_CORRECT}`
              : phase === 'cleared'
                ? 'УР. 2 ПРОЙДЕН'
                : 'ПЕРЕДЫШКА…'),
    });
  };

  const nearFather = (): boolean => Math.abs(player.x - FATHER_X) < 36;

  const beginTalk = (): void => {
    if (dialogue.isOpen || phase !== 'walk') return;
    phase = 'talk';
    player.vx = 0;
    dialogue.open(FATHER_TALK_SCRIPT, (_id, result) => {
      if (result.effect === 'wrong_reassure') {
        player.takeDamage(QUIZ_MF_COST, -1);
        toast = `ПУСТЫЕ СЛОВА −${QUIZ_MF_COST} СД`;
        toastTimer = 1.4;
      } else {
        toast = 'ОТЕЦ СЛУШАЕТ';
        toastTimer = 1.2;
      }
      if (player.isKo) {
        phase = 'gameover';
        gameOverTimer = 1.8;
        return;
      }
      phase = 'quiz';
      quizIndex = 0;
      quizDone = 0;
      openNextQuiz();
      syncHud();
    });
  };

  const openNextQuiz = (): void => {
    if (quizDone >= NEED_CORRECT) {
      phase = 'cleared';
      winTimer = 2.4;
      toast = 'ВЫБОР ОБЪЯСНЁН';
      toastTimer = 2.2;
      syncHud('УР. 2 ПРОЙДЕН');
      return;
    }
    quiz.openFromBank('Отец', GRADUATION_QUESTIONS, quizIndex, () => {
      quizDone += 1;
      quizIndex += 1;
      player.addSwagger(12);
      toast = `ВЕРНО · ${quizDone}/${NEED_CORRECT}`;
      toastTimer = 1.0;
      if (quizDone >= NEED_CORRECT) {
        phase = 'cleared';
        winTimer = 2.4;
        toast = 'ВЫБОР ОБЪЯСНЁН';
        toastTimer = 2.2;
      } else {
        // slight delay then next
        window.setTimeout(() => {
          if (phase === 'quiz') openNextQuiz();
        }, 400);
      }
      syncHud();
    });
  };

  const tickQuizInput = (): void => {
    const input = states.input;
    if (!input || !quiz.isOpen) return;
    const tryAns = (i: number): void => {
      const r = quiz.selectAnswer(i);
      if (r === 'wrong') {
        player.takeDamage(QUIZ_MF_COST, player.facing === 1 ? -1 : 1);
        toast = `−${QUIZ_MF_COST} СД`;
        toastTimer = 0.8;
      } else if (r === 'correct') {
        toast = 'ОТВЕЧЕНО';
        toastTimer = 0.6;
      }
    };
    if (input.justPressed('choice1')) tryAns(0);
    else if (input.justPressed('choice2')) tryAns(1);
    else if (input.justPressed('choice3')) tryAns(2);
    else if (input.justPressed('choice4')) tryAns(3);
    else if (input.justPressed('hint') || input.justPressed('special')) {
      if (quiz.takeHint()) {
        player.takeDamage(QUIZ_MF_COST, player.facing === 1 ? -1 : 1);
        toast = `ПОДСКАЗКА −${QUIZ_MF_COST} СД`;
        toastTimer = 0.9;
      }
    }
  };

  return {
    enter(): void {
      audio.playTheme('stairwell');
      beer.pauseForFlashback();
      preloadApartmentPhotos();
      preloadFatherRoomPhotos();
      preloadFatherTv();
      preloadFamilyFaces();
      player.setEra('teen');
      player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
      player.x = 70;
      player.setFloorY(FLOOR_Y);
      player.y = FLOOR_Y;
      player.facing = 1;
      player.walkSpeed = 55;
      phase = 'walk';
      toast = 'ВЫПУСКНОЙ · 1995';
      toastTimer = 1.6;
      time = 0;
      winTimer = 0;
      gameOverTimer = 0;
      quizIndex = 0;
      quizDone = 0;
      dialogue.resetSilent();
      quiz.closeSilent();
      syncHud('Подойди к отцу');
    },

    exit(): void {
      dialogue.resetSilent();
      quiz.closeSilent();
      hud.set({ showSwagger: false });
    },

    update(dt: number): void {
      time += dt;
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toast = '';
      }

      if (phase === 'gameover') {
        gameOverTimer -= dt;
        player.update(dt);
        quiz.closeSilent();
        syncHud('ПЕРЕДЫШКА…');
        if (gameOverTimer <= 0) {
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0.55 });
        }
        return;
      }

      if (phase === 'cleared') {
        winTimer -= dt;
        player.update(dt);
        syncHud('УР. 2 ПРОЙДЕН');
        if (winTimer <= 0) {
          states.setFlag('level2Cleared', true);
          player.resetCombatProgress({ fortitude: MAX_FORTITUDE, swagger: 0 });
          states.goto('apartment_2026', {
            era: 'ERA_2026',
            fadeSeconds: 0.65,
            data: { afterLevel2: true },
          });
        }
        return;
      }

      if (phase === 'talk' && dialogue.isOpen) {
        dialogue.update(dt);
        player.update(dt);
        const input = states.input;
        if (input) {
          if (dialogue.hasChoices) {
            if (input.justPressed('choice1')) dialogue.selectChoice(0);
            else if (input.justPressed('choice2')) dialogue.selectChoice(1);
          } else if (input.justPressed('confirm') || input.justPressed('interact')) {
            dialogue.advance();
          }
        }
        syncHud();
        return;
      }

      if (phase === 'quiz') {
        quiz.update(dt);
        tickQuizInput();
        player.update(dt);
        if (player.isKo) {
          phase = 'gameover';
          gameOverTimer = 1.8;
          quiz.closeSilent();
          toast = 'СИЛА ДУХА СЛОМЛЕНА';
          toastTimer = 1.8;
        }
        syncHud();
        return;
      }

      // walk
      player.update(dt);
      const input = states.input;
      if (input && !player.isKo) {
        if (input.justPressed('jump')) player.tryJump();
        player.applyWalk(input.axisX(), dt, 24, WIDTH - 24);
        if (
          (input.justPressed('interact') || input.justPressed('confirm')) &&
          nearFather()
        ) {
          beginTalk();
        }
      }
      player.applyPhysics(dt, 24, WIDTH - 24);
      syncHud();
    },

    render(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      _ctx: unknown,
      width: number,
      height: number,
    ): void {
      drawGradRoom(ctx, width, height, time);
      drawFather(ctx, FATHER_X, FLOOR_Y, time);
      player.render(ctx, alpha);

      if (phase === 'talk' && dialogue.isOpen) {
        dialogue.render(ctx, width, height);
      } else if (quiz.isOpen) {
        quiz.render(ctx, width, height);
      } else {
        const hint =
          phase === 'walk'
            ? 'E — поговорить с отцом'
            : phase === 'quiz'
              ? quizHudHint()
              : '';
        if (hint) {
          const hw = measureUiText(ctx, hint, 6.5, 500) + 10;
          uiPanel(
            ctx,
            4,
            height - 14,
            Math.min(hw, width - 8),
            11,
            'rgba(10,12,18,0.72)',
            'rgba(120,100,60,0.45)',
          );
          drawUiText(ctx, hint, 8, height - 11, P.brass, 6.5, 500);
        }
      }

      if (toast) {
        const tw2 = measureUiText(ctx, toast, 7, 600) + 14;
        uiPanel(
          ctx,
          Math.round((width - tw2) / 2),
          36,
          tw2,
          13,
          'rgba(32,16,24,0.88)',
          'rgba(240,192,64,0.7)',
        );
        drawUiTextCentered(ctx, toast, width / 2, 39, '#f8f0d0', 7, 600);
      }

      if (phase === 'gameover') {
        ctx.fillStyle = 'rgba(8, 4, 8, 0.55)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Передышка…', width / 2, height / 2 - 10, '#d8d0c0', 12, 700);
        drawUiTextCentered(ctx, 'Назад в 2026', width / 2, height / 2 + 6, '#a8a090', 7, 500);
      }

      if (phase === 'cleared') {
        ctx.fillStyle = 'rgba(4, 12, 8, 0.45)';
        ctx.fillRect(0, 0, width, height);
        drawUiTextCentered(ctx, 'Ур. 2 пройден', width / 2, height / 2 - 12, '#a0f0c0', 12, 700);
        drawUiTextCentered(ctx, 'Выпускной · выбор', width / 2, height / 2 + 6, P.brass, 7, 500);
      }
    },

    getDialogue(): DialogueSystem {
      return dialogue;
    },

    getQuiz(): QuizSystem {
      return quiz;
    },

    __debug: {
      getPhase: () => phase,
      getTime: () => time,
      setTime: (t: number) => {
        time = t;
      },
      forceTalk: () => beginTalk(),
      forceQuiz: () => {
        phase = 'quiz';
        quizDone = 0;
        quizIndex = 0;
        openNextQuiz();
      },
    },
  };
}

function drawGradRoom(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
): void {
  drawMdWallpaper(ctx, 0, 0, width, FLOOR_Y - 8, 'podezd');
  px(ctx, 0, FLOOR_Y - 8, width, height - (FLOOR_Y - 8), '#3a3428');
  ditherRect(ctx, 0, FLOOR_Y - 8, width, 4, '#4a4030', '#3a3428');
  // Window evening
  px(ctx, 40, 36, 56, 48, '#1a2838');
  px(ctx, 44, 40, 48, 40, '#2a4058');
  px(ctx, 66, 40, 2, 40, '#1a2838');
  px(ctx, 44, 60, 48, 2, '#1a2838');
  // Soft floor lamp (between wall photos and father — CRT owns the right wall)
  px(ctx, 226, 52, 8, 8, '#f0d080');
  px(ctx, 224, 60, 12, 40, '#5a4830');
  // Graduation banner
  px(ctx, 100, 28, 120, 14, '#4a2040');
  drawUiText(ctx, 'ВЫПУСКНОЙ — 1995', 110, 32, '#f0d0e0', 7, 650);
  // Framed Solaris stills on the wall (Kelvin window + house porch)
  drawFatherRoomWallPhotos(ctx);
  // CRT TV — Stierlitz → Putin after 5s
  drawFatherTv(ctx, t);
  // Floor speckles
  speckles(ctx, 0, FLOOR_Y, width, 20, '#2a2418', 5, Math.floor(t));
}

function drawFather(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  t: number,
): void {
  const ox = Math.round(x);
  const oy = Math.round(floorY);
  const bob = Math.sin(t * 1.5) > 0.7 ? 1 : 0;
  // Facing right toward the CRT on the right wall
  // Charcoal polo body (weight shifted toward TV)
  px(ctx, ox - 5, oy - 34 + bob, 14, 22, '#3a3a40');
  px(ctx, ox + 1, oy - 32 + bob, 4, 6, '#505058');
  px(ctx, ox - 2, oy - 34 + bob, 8, 3, '#c8c0b0'); // collar
  // Near arm / shoulder toward screen
  px(ctx, ox + 7, oy - 30 + bob, 4, 10, '#3a3a40');
  // Photo face flipped so gaze reads toward the CRT
  px(ctx, ox - 2, oy - 44 + bob, 10, 12, '#d0a878');
  const fx = ox - 2;
  const fy = oy - 45 + bob;
  ctx.save();
  ctx.translate(fx + 5, fy);
  ctx.scale(-1, 1);
  const drew = drawFamilyFaceWithRim(ctx, 'father', -5, 0, 10, 12);
  ctx.restore();
  if (!drew) {
    px(ctx, ox + 2, oy - 40 + bob, 2, 2, '#181018');
    px(ctx, ox + 5, oy - 40 + bob, 2, 2, '#181018');
  }
  // Hair rim
  px(ctx, ox - 2, oy - 46 + bob, 10, 3, '#2a2420');
  px(ctx, ox - 1, oy - 47 + bob, 8, 2, '#3a3430');
  // Legs / shoes (stance toward TV)
  px(ctx, ox - 3, oy - 12, 4, 8, '#2a2830');
  px(ctx, ox + 3, oy - 12, 4, 8, '#2a2830');
  px(ctx, ox - 4, oy - 4, 5, 4, '#18141c');
  px(ctx, ox + 3, oy - 4, 5, 4, '#18141c');
  // Prompt pip
  if (Math.floor(t * 2) % 2 === 0) {
    drawUiText(ctx, '!', ox - 12, oy - 48, '#e04040', 8, 700);
  }
}
