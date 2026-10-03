/**
 * DialogueSystem — modal overlays, typewriter, timed choice branches.
 * Phase 4: father-stall mid-fight choices that drain MF or calm panic.
 */

import { drawUiText, measureUiText, uiPanel } from '@/art/uiFont';
export type DialogueEffect =
  | 'calm_father'
  | 'calm_mother'
  | 'calm_relative'
  | 'calm_goods'
  | 'calm_bridge'
  | 'calm_disco'
  | 'calm_detinets'
  | 'wrong_reassure'
  | 'none';

export interface DialogueChoice {
  id: string;
  /** Short label drawn next to 1/2 key. */
  label: string;
  effect?: DialogueEffect;
  /** Next line id, or null/omit to close after choice. */
  next?: string | null;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  /** Next line id when no choices; null closes. */
  next?: string | null;
  choices?: DialogueChoice[];
  /** Seconds to pick; only used when choices present. */
  choiceTimeLimit?: number;
  /** Index auto-selected on timeout (default: last choice = wrong). */
  timeoutChoiceIndex?: number;
}

export interface DialogueScript {
  id: string;
  lines: Record<string, DialogueLine>;
  start: string;
}

export type DialogueCloseCallback = (
  scriptId: string,
  result: { effect: DialogueEffect; choiceId: string | null; timedOut: boolean },
) => void;

export class DialogueSystem {
  private active: DialogueScript | null = null;
  private lineId: string | null = null;
  private onClose: DialogueCloseCallback | null = null;
  private visibleChars = 0;
  private revealSpeed = 48; // chars per second
  private choiceTimer = 0;
  private choiceLimit = 0;
  private lastEffect: DialogueEffect = 'none';
  private lastChoiceId: string | null = null;
  private timedOut = false;
  private settled = false;

  get isOpen(): boolean {
    return this.active !== null;
  }

  get currentLine(): DialogueLine | null {
    if (!this.active || !this.lineId) return null;
    return this.active.lines[this.lineId] ?? null;
  }

  get hasChoices(): boolean {
    const line = this.currentLine;
    return !!line?.choices && line.choices.length > 0 && this.revealComplete;
  }

  get revealComplete(): boolean {
    const line = this.currentLine;
    if (!line) return false;
    return this.visibleChars >= line.text.length;
  }

  get choiceSecondsLeft(): number {
    return this.choiceTimer;
  }

  /** Short labels for on-screen choice buttons (touch UI). */
  get choiceLabels(): [string, string] | null {
    const line = this.currentLine;
    if (!line?.choices || line.choices.length < 2 || !this.revealComplete) return null;
    return [line.choices[0]!.label, line.choices[1]!.label];
  }

  /**
   * Hit-test a canvas-space point against choice rows / advance hint.
   * Returns choice index, `'advance'`, or null.
   */
  hitTest(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
  ): number | 'advance' | null {
    const line = this.currentLine;
    if (!line || !this.active) return null;

    const hasChoices = !!(line.choices && line.choices.length > 0);
    const boxH = hasChoices && this.revealComplete ? 84 : 44;
    const pad = 4;
    const boxY = canvasHeight - boxH - pad;
    const boxX = pad;
    const boxW = canvasWidth - pad * 2;

    if (x < boxX || x > boxX + boxW || y < boxY || y > boxY + boxH) return null;

    if (!this.revealComplete) return 'advance';

    if (hasChoices && line.choices) {
      // Thumb-friendly rows (taller than drawn text).
      for (let i = 0; i < line.choices.length; i++) {
        const rowTop = boxY + 40 + i * 18;
        const rowBottom = rowTop + 18;
        if (y >= rowTop && y <= rowBottom) return i;
      }
      return null;
    }

    return 'advance';
  }

  /** Begin a script. Closes any previous dialogue first. */
  open(script: DialogueScript, onClose?: DialogueCloseCallback): void {
    this.active = script;
    this.lineId = script.start;
    this.visibleChars = 0;
    this.onClose = onClose ?? null;
    this.lastEffect = 'none';
    this.lastChoiceId = null;
    this.timedOut = false;
    this.settled = false;
    this.armChoiceTimer();
  }

  close(): void {
    if (this.settled || !this.active) {
      this.active = null;
      this.lineId = null;
      this.visibleChars = 0;
      this.onClose = null;
      return;
    }
    this.settled = true;
    const id = this.active.id;
    const result = {
      effect: this.lastEffect,
      choiceId: this.lastChoiceId,
      timedOut: this.timedOut,
    };
    this.active = null;
    this.lineId = null;
    this.visibleChars = 0;
    const cb = this.onClose;
    this.onClose = null;
    cb?.(id, result);
  }

  /** Clear without firing onClose (scene enter / exit). */
  resetSilent(): void {
    this.active = null;
    this.lineId = null;
    this.visibleChars = 0;
    this.onClose = null;
    this.choiceTimer = 0;
    this.choiceLimit = 0;
    this.lastEffect = 'none';
    this.lastChoiceId = null;
    this.timedOut = false;
    this.settled = false;
  }

  /** Advance typewriter or non-choice lines. */
  advance(): void {
    const line = this.currentLine;
    if (!line || !this.active) return;

    if (this.visibleChars < line.text.length) {
      this.visibleChars = line.text.length;
      this.armChoiceTimer();
      return;
    }

    if (line.choices && line.choices.length > 0) {
      // Waiting for numbered choice / timeout
      return;
    }

    if (line.next == null || line.next === '') {
      this.close();
      return;
    }
    this.lineId = line.next;
    this.visibleChars = 0;
    this.armChoiceTimer();
  }

  /** Pick choice by 0-based index (keys 1/2 → 0/1). */
  selectChoice(index: number): boolean {
    const line = this.currentLine;
    if (!line?.choices || !this.revealComplete) return false;
    const choice = line.choices[index];
    if (!choice) return false;
    return this.applyChoice(choice, false);
  }

  update(dt: number): void {
    const line = this.currentLine;
    if (!line) return;

    if (this.visibleChars < line.text.length) {
      this.visibleChars = Math.min(
        line.text.length,
        this.visibleChars + this.revealSpeed * dt,
      );
      if (this.visibleChars >= line.text.length) this.armChoiceTimer();
      return;
    }

    if (line.choices && line.choices.length > 0 && this.choiceLimit > 0) {
      this.choiceTimer -= dt;
      if (this.choiceTimer <= 0) {
        const idx =
          line.timeoutChoiceIndex ??
          Math.max(0, line.choices.length - 1);
        const choice = line.choices[idx];
        if (choice) this.applyChoice(choice, true);
      }
    }
  }

  /** Timed choice overlay at bottom of internal resolution. */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const line = this.currentLine;
    if (!line) return;

    const hasChoices = !!(line.choices && line.choices.length > 0);
    const boxH = hasChoices && this.revealComplete ? 84 : 44;
    const pad = 4;
    const y = canvasHeight - boxH - pad;

    ctx.fillStyle = 'rgba(6, 8, 14, 0.94)';
    ctx.fillRect(pad, y, canvasWidth - pad * 2, boxH);
    ctx.strokeStyle = '#e8c56a';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, y + 0.5, canvasWidth - pad * 2 - 1, boxH - 1);
    // Inner chrome
    ctx.strokeStyle = '#604820';
    ctx.strokeRect(pad + 2.5, y + 2.5, canvasWidth - pad * 2 - 5, boxH - 5);

    drawUiText(ctx, line.speaker, pad + 6, y + 6, '#e8c56a', 8, 650);

    const shown = line.text.slice(0, Math.floor(this.visibleChars));
    this.drawWrapped(ctx, shown, pad + 6, y + 18, canvasWidth - pad * 2 - 12, '#e8e4d8');

    if (!this.revealComplete) {
      drawUiText(ctx, 'Enter', canvasWidth - 36, y + boxH - 11, '#887848', 6.5, 500);
      return;
    }

    if (hasChoices && line.choices) {
      if (this.choiceLimit > 0) {
        const barW = canvasWidth - pad * 2 - 12;
        const pct = Math.max(0, this.choiceTimer / this.choiceLimit);
        ctx.fillStyle = '#1a1420';
        ctx.fillRect(pad + 6, y + 34, barW, 4);
        ctx.fillStyle = pct < 0.33 ? '#e04040' : pct < 0.6 ? '#f0c040' : '#40c878';
        ctx.fillRect(pad + 6, y + 34, Math.round(barW * pct), 4);
        const sec = Math.ceil(Math.max(0, this.choiceTimer));
        drawUiText(ctx, `${sec}с`, pad + 6 + barW - 14, y + 32, '#f0e8c8', 6.5, 600);
      }

      line.choices.forEach((c, i) => {
        const cy = y + 44 + i * 14;
        const key = String(i + 1);
        uiPanel(ctx, pad + 6, cy - 2, 12, 11, 'rgba(32,24,40,0.9)', 'rgba(232,197,106,0.8)');
        drawUiText(ctx, key, pad + 9, cy, '#f8f0d0', 7, 700);
        drawUiText(ctx, c.label, pad + 22, cy, '#d8d0c0', 7, 550);
      });
    } else {
      drawUiText(ctx, 'Enter', canvasWidth - 36, y + boxH - 11, '#887848', 6.5, 500);
    }
  }

  private applyChoice(choice: DialogueChoice, timedOut: boolean): boolean {
    this.lastEffect = choice.effect ?? 'none';
    this.lastChoiceId = choice.id;
    this.timedOut = timedOut;

    if (choice.next == null || choice.next === '') {
      this.close();
      return true;
    }
    this.lineId = choice.next;
    this.visibleChars = 0;
    this.armChoiceTimer();
    return true;
  }

  private armChoiceTimer(): void {
    const line = this.currentLine;
    if (line?.choices && line.choices.length > 0 && this.revealComplete) {
      this.choiceLimit = line.choiceTimeLimit ?? 6;
      this.choiceTimer = this.choiceLimit;
    } else {
      this.choiceLimit = 0;
      this.choiceTimer = 0;
    }
  }

  private drawWrapped(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    color: string,
  ): void {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (measureUiText(ctx, trial, 7.5, 500) > maxW && line) {
        drawUiText(ctx, line, x, yy, color, 7.5, 500);
        line = w;
        yy += 10;
      } else {
        line = trial;
      }
    }
    if (line) drawUiText(ctx, line, x, yy, color, 7.5, 500);
  }
}

/** Level 1 father-stall script — timed reassurance branch. */
export const FATHER_STALL_SCRIPT: DialogueScript = {
  id: 'father_stall_midfight',
  start: 'intro',
  lines: {
    intro: {
      speaker: 'Отец',
      text: 'Шубу у мамы сперли! Я остолбенел - что делать?',
      next: 'choice',
    },
    choice: {
      speaker: 'Отец',
      text: 'Сынок - скажи что-нибудь. Быстро!',
      choiceTimeLimit: 7,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'steady',
          label: 'Держись. Я разберусь.',
          effect: 'calm_father',
          next: 'calm_ok',
        },
        {
          id: 'empty',
          label: 'Всё будет хорошо...',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    calm_ok: {
      speaker: 'Отец',
      text: 'Да. Глаза востро. Забери шубу - я у лотка.',
      next: null,
    },
    panic_worse: {
      speaker: 'Отец',
      text: 'Пустые слова! Они ещё злее - ДВИГАЙ!',
      next: null,
    },
  },
};

/** Level 2 mid-stair thug / mother timed branch (крыша shakedown). */
export const PODEZD_LANDING_SCRIPT: DialogueScript = {
  id: 'podezd_landing_midfight',
  start: 'thug_intro',
  lines: {
    thug_intro: {
      speaker: 'Гопник',
      text: 'Подъезд семь. Крыша. Мама тут, пока не заплатите.',
      next: 'mother_line',
    },
    mother_line: {
      speaker: 'Мама',
      text: 'Саша - осторожно. Говори правду. Времени мало.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Что ответить?',
      choiceTimeLimit: 7,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'stand',
          label: 'Отвали. Она со мной.',
          effect: 'calm_mother',
          next: 'stand_ok',
        },
        {
          id: 'empty',
          label: 'У нас ничего нет...',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    stand_ok: {
      speaker: 'Мама',
      text: 'Хорошо. Держи руку - поднимаемся. Смотри площадки.',
      next: null,
    },
    panic_worse: {
      speaker: 'Гопник',
      text: 'Пустые карманы? Тогда кулаки. Наверх - ПОШЁЛ!',
      next: null,
    },
  },
};

/** Level 3 вокзал — mid-platform bag / money shakedown. */
export const VOKZAL_PLATFORM_SCRIPT: DialogueScript = {
  id: 'vokzal_platform_midfight',
  start: 'thug_intro',
  lines: {
    thug_intro: {
      speaker: 'Гопник',
      text: 'Сумка. Деньги. Или тётка остаётся на перроне.',
      next: 'relative_line',
    },
    relative_line: {
      speaker: 'Тётя',
      text: 'Саша… посылка от отца внутри. Не отдавай просто так.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Что ответить?',
      choiceTimeLimit: 7,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'stand',
          label: 'Отвали. Посылка наша.',
          effect: 'calm_relative',
          next: 'stand_ok',
        },
        {
          id: 'empty',
          label: 'Может, договоримся…',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    stand_ok: {
      speaker: 'Тётя',
      text: 'Хорошо. Держись рядом — заберём свёрток.',
      next: null,
    },
    panic_worse: {
      speaker: 'Гопник',
      text: 'Слабак. Тогда кулаки — и посылка наша!',
      next: null,
    },
  },
};

/** Level 4 гаражи — father’s goods / крыша branch. */
export const GARAZHI_ROOF_SCRIPT: DialogueScript = {
  id: 'garazhi_roof_midfight',
  start: 'thug_intro',
  lines: {
    thug_intro: {
      speaker: 'Гопник',
      text: 'Гаражи — наша крыша. Ящик отца — наш процент.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Крыша или кулаки?',
      choiceTimeLimit: 7,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'stand',
          label: 'Ящик наш. Уходите.',
          effect: 'calm_goods',
          next: 'stand_ok',
        },
        {
          id: 'empty',
          label: 'Может, процент…',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    stand_ok: {
      speaker: 'Зуич',
      text: 'Тогда зачищаем ряд — и ящик домой.',
      next: null,
    },
    panic_worse: {
      speaker: 'Гопник',
      text: 'Процент? Нет. Ломаем кости — потом ящик.',
      next: null,
    },
  },
};

/** Level 5 двор — short beat before boss-lite wave. */
export const DVOR_ROOF_SCRIPT: DialogueScript = {
  id: 'dvor_roof_midfight',
  start: 'intro',
  lines: {
    intro: {
      speaker: 'Старший',
      text: 'Двор. Крыша. Ты далеко зашёл, пацан.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Финал блока — что скажешь?',
      choiceTimeLimit: 6,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'stand',
          label: 'Я не сдамся.',
          effect: 'calm_relative',
          next: 'stand_ok',
        },
        {
          id: 'empty',
          label: 'Может, разойдёмся…',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    stand_ok: {
      speaker: 'Старший',
      text: 'Тогда на крышу. Покажи зубы.',
      next: null,
    },
    panic_worse: {
      speaker: 'Старший',
      text: 'Слабо. Ребята — разнесите его.',
      next: null,
    },
  },
};

/** Level 6 мост — Volkhov bridge shakedown / father’s letter. */
export const MOST_BRIDGE_SCRIPT: DialogueScript = {
  id: 'most_bridge_midfight',
  start: 'thug_intro',
  lines: {
    thug_intro: {
      speaker: 'Гопник',
      text: 'Мост наш. Конверт отца — наш. Прыгай в Волхов или отдавай.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Лёд трещит. Что ответить?',
      choiceTimeLimit: 7,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'stand',
          label: 'Конверт мой. С дороги.',
          effect: 'calm_bridge',
          next: 'stand_ok',
        },
        {
          id: 'empty',
          label: 'Может, поделим…',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    stand_ok: {
      speaker: 'Зуич',
      text: 'Тогда через мост — и письмо домой.',
      next: null,
    },
    panic_worse: {
      speaker: 'Гопник',
      text: 'Делить? Нет. Ломаем — потом конверт.',
      next: null,
    },
  },
};

/** Level 7 дискотека — bouncer / dance-floor crew. */
export const DISKO_CLUB_SCRIPT: DialogueScript = {
  id: 'disko_club_midfight',
  start: 'bouncer_intro',
  lines: {
    bouncer_intro: {
      speaker: 'Вышибала',
      text: '«Орбита» — не для пацанов с района. Кассета старшего — внутри.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Неон режет глаза. Как войти?',
      choiceTimeLimit: 7,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'stand',
          label: 'Я за кассетой. Пусти.',
          effect: 'calm_disco',
          next: 'stand_ok',
        },
        {
          id: 'empty',
          label: 'Может, договоримся…',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    stand_ok: {
      speaker: 'Вышибала',
      text: 'Смелый. Тогда на танцпол — сами разберётесь.',
      next: null,
    },
    panic_worse: {
      speaker: 'Вышибала',
      text: 'Слабак. Ребята — снимите его с ритма.',
      next: null,
    },
  },
};

/** Level 8 детинец — final winter showdown on the wall. */
export const DETINETS_WALL_SCRIPT: DialogueScript = {
  id: 'detinets_wall_midfight',
  start: 'intro',
  lines: {
    intro: {
      speaker: 'Старший',
      text: 'Детинец. Стена. Дальше бежать некуда, Зуич.',
      next: 'choice',
    },
    choice: {
      speaker: 'Зуич',
      text: 'Финал зимы — что скажешь?',
      choiceTimeLimit: 6,
      timeoutChoiceIndex: 1,
      choices: [
        {
          id: 'stand',
          label: 'Долг закрываю сам.',
          effect: 'calm_detinets',
          next: 'stand_ok',
        },
        {
          id: 'empty',
          label: 'Может, хватит…',
          effect: 'wrong_reassure',
          next: 'panic_worse',
        },
      ],
    },
    stand_ok: {
      speaker: 'Старший',
      text: 'Тогда на стену. Покажи, кто ты.',
      next: null,
    },
    panic_worse: {
      speaker: 'Старший',
      text: 'Хватит? Нет. Стена запомнит тебя.',
      next: null,
    },
  },
};

/** Debug helper so TypeScript callers can assert portrait-free overlay. */
export function dialogueChoiceHint(): string {
  return '1 / 2 выбор · ENTER дальше · таймер сам выберет';
}
