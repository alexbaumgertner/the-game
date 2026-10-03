/**
 * Shared helpers to drive quiz encounters instead of punch/kick combat.
 */

import type { Input } from '@/core/Input';
import type { Gangster } from '@/entities/Gangster';
import type { Player } from '@/entities/Player';
import { QuizSystem, QUIZ_MF_COST } from '@/systems/QuizSystem';

const SPEAKERS = ['Взрослый', 'Тётя', 'Дядя', 'Продавец', 'Прохожий'] as const;

export function nearestQuizNpc(
  gangsters: Gangster[],
  playerX: number,
  range = 30,
): Gangster | null {
  let best: Gangster | null = null;
  let bestDist = range;
  for (const g of gangsters) {
    if (g.isKo || !g.quizOnly) continue;
    const d = Math.abs(g.x - playerX);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return best;
}

export function speakerFor(g: Gangster): string {
  if (g.variant === 'adult') return 'Взрослый';
  if (g.variant === 'tracksuit') return 'Парень';
  return SPEAKERS[Math.floor(Math.random() * SPEAKERS.length)]!;
}

export interface QuizTickResult {
  toast: string;
  toastTimer: number;
  /** True if player KO'd from MF drain. */
  playerKo: boolean;
}

/**
 * While quiz is open: handle 1–4 / hint.
 * When closed: E or auto-near starts quiz with nearest adult.
 */
export function tickQuizEncounter(opts: {
  quiz: QuizSystem;
  input: Input | null;
  player: Player;
  gangsters: Gangster[];
  dt: number;
  /** Auto-open when standing next to NPC (default true). */
  autoOpen?: boolean;
  swaggerOnCorrect?: number;
}): QuizTickResult {
  const {
    quiz,
    input,
    player,
    gangsters,
    dt,
    autoOpen = true,
    swaggerOnCorrect = 14,
  } = opts;
  let toast = '';
  let toastTimer = 0;

  quiz.update(dt);

  if (quiz.isOpen) {
    if (input) {
      if (input.justPressed('choice1')) {
        const r = quiz.selectAnswer(0);
        if (r === 'wrong') {
          player.takeDamage(QUIZ_MF_COST, player.facing === 1 ? -1 : 1);
          toast = `−${QUIZ_MF_COST} СД`;
          toastTimer = 0.8;
        } else if (r === 'correct') {
          player.addSwagger(swaggerOnCorrect);
          toast = 'ОТВЕЧЕНО';
          toastTimer = 0.7;
        }
      } else if (input.justPressed('choice2')) {
        const r = quiz.selectAnswer(1);
        if (r === 'wrong') {
          player.takeDamage(QUIZ_MF_COST, player.facing === 1 ? -1 : 1);
          toast = `−${QUIZ_MF_COST} СД`;
          toastTimer = 0.8;
        } else if (r === 'correct') {
          player.addSwagger(swaggerOnCorrect);
          toast = 'ОТВЕЧЕНО';
          toastTimer = 0.7;
        }
      } else if (input.justPressed('choice3')) {
        const r = quiz.selectAnswer(2);
        if (r === 'wrong') {
          player.takeDamage(QUIZ_MF_COST, player.facing === 1 ? -1 : 1);
          toast = `−${QUIZ_MF_COST} СД`;
          toastTimer = 0.8;
        } else if (r === 'correct') {
          player.addSwagger(swaggerOnCorrect);
          toast = 'ОТВЕЧЕНО';
          toastTimer = 0.7;
        }
      } else if (input.justPressed('choice4')) {
        const r = quiz.selectAnswer(3);
        if (r === 'wrong') {
          player.takeDamage(QUIZ_MF_COST, player.facing === 1 ? -1 : 1);
          toast = `−${QUIZ_MF_COST} СД`;
          toastTimer = 0.8;
        } else if (r === 'correct') {
          player.addSwagger(swaggerOnCorrect);
          toast = 'ОТВЕЧЕНО';
          toastTimer = 0.7;
        }
      } else if (input.justPressed('hint') || input.justPressed('special')) {
        if (quiz.takeHint()) {
          player.takeDamage(QUIZ_MF_COST, player.facing === 1 ? -1 : 1);
          toast = `ПОДСКАЗКА −${QUIZ_MF_COST} СД`;
          toastTimer = 0.9;
        }
      }
    }
    return { toast, toastTimer, playerKo: player.isKo };
  }

  // Start quiz with nearest adult
  const near = nearestQuizNpc(gangsters, player.x, 30);
  if (near && input && !player.isKo) {
    const want =
      input.justPressed('interact') ||
      input.justPressed('confirm') ||
      (autoOpen && near.inQuizRange(player.x, 22));
    if (want) {
      const target = near;
      quiz.open(speakerFor(target), () => {
        target.resolveByQuiz();
      });
      toast = 'ВОПРОС!';
      toastTimer = 0.6;
    }
  }

  return { toast, toastTimer, playerKo: player.isKo };
}
