/**
 * Level 12 «Финал» — calm closing. Credits / personal lines → TODO(owner).
 */

export const FINALE_QUESTIONS = [
  'Кто я без роли?',
  'Что остаётся, когда шум стих?',
  'Куда идти — если можно остаться?',
] as const;

export const FINALE_MONTAGE = [
  { year: '1995', title: 'Рынок и дом' },
  { year: '1995', title: 'Выпускной' },
  { year: '2010', title: 'Армия — искра' },
  { year: '2015', title: 'Распорядок' },
  { year: '2015', title: 'Круг' },
  { year: 'сейчас', title: 'Квартира' },
] as const;

export const NEWCOMER_LINES = {
  ask: 'Новичок: Здесь… можно просто сидеть?',
  listenOk: 'Зуич: Можно. Я побуду рядом.',
  adviseWeak: 'Зуич: Если слабо — не геройствуй. Скажи вслух.',
  askShare: 'Зуич: Хочешь — расскажи. Не обязательно красиво.',
  pourPivo: 'Зуич: Держи ПИВО. Это ромашка. Согревает.',
} as const;

/** Credits — only «Зуич»; rest TODO(owner). */
export const FINALE_CREDITS = [
  'Зуич',
  'TODO(owner): кому ещё сказать спасибо',
  'TODO(owner): музыка / голоса',
  'TODO(owner): дата и место',
] as const;

export const FINALE_CLOSING =
  'Квартира цветная. Дневник открыт. Можно начать снова.';
