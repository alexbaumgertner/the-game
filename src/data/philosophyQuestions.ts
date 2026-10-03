/**
 * Philosophy quiz banks for Novgorod 1995.
 * L1 / market encounters — economist-philosophers (Smith, Ricardo, Marx…).
 * L2 / father — pedagogy (Piaget, Vygotsky…).
 * Later levels — light general philosophy as default deck.
 */

export type QuizSubject =
  | 'рынок'
  | 'смит'
  | 'рикардо'
  | 'маркс'
  | 'кейнс'
  | 'хайек'
  | 'педагогика'
  | 'пиаже'
  | 'выготский'
  | 'философия';

export interface QuizQuestion {
  id: string;
  subject: QuizSubject;
  /** Topic depth band (informational). */
  grade: number;
  question: string;
  /** Exactly 4 answers; correctIndex points to the right one. */
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  /** Short subject clue shown as a paid hint (not the answer). */
  hintClue: string;
}

/** @deprecated Use QuizQuestion — kept for older imports. */
export type SchoolQuestion = QuizQuestion;

/** Level 1 / market — Adam Smith and economist-philosophers. */
export const MARKET_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'smith-hand',
    subject: 'смит',
    grade: 1,
    question: '«Невидимая рука» Адама Смита — это…',
    answers: [
      'Стихийный порядок рынка через личный интерес',
      'Рука государства в ценах',
      'Тайный сговор купцов',
      'Налог на лавки',
    ],
    correctIndex: 0,
    hintClue: 'Личная выгода, складываясь, служит общему благу — без приказа сверху.',
  },
  {
    id: 'smith-wealth',
    subject: 'смит',
    grade: 1,
    question: 'Главный труд Адама Смита о богатстве народов называется…',
    answers: [
      '«Исследование о природе и причинах богатства народов»',
      '«Капитал»',
      '«Общая теория занятости»',
      '«Дорога к рабству»',
    ],
    correctIndex: 0,
    hintClue: '1776 год; не путай с Марксом и Кейнсом.',
  },
  {
    id: 'smith-division',
    subject: 'смит',
    grade: 1,
    question: 'Смит связывал рост производительности прежде всего с…',
    answers: [
      'Разделением труда',
      'Запретом импорта',
      'Отменой денег',
      'Единой ценой на всё',
    ],
    correctIndex: 0,
    hintClue: 'Пример с булавочной мануфактурой — специализация ускоряет дело.',
  },
  {
    id: 'smith-self',
    subject: 'смит',
    grade: 1,
    question: 'По Смиту, мясник и пекарь кормят нас скорее из…',
    answers: [
      'Своего интереса, а не из милости',
      'Страха перед князем',
      'Любви к соседу',
      'Приказа гильдии',
    ],
    correctIndex: 0,
    hintClue: 'Знаменитый пассаж про интерес, а не благотворительность.',
  },
  {
    id: 'ricardo-compare',
    subject: 'рикардо',
    grade: 1,
    question: 'Сравнительное преимущество (Рикардо) значит, что торговать выгодно, если…',
    answers: [
      'Страна относительно лучше в одном деле, чем в другом',
      'Обе стороны производят одно и то же',
      'Запрещены все пошлины навсегда',
      'Цены назначает государство',
    ],
    correctIndex: 0,
    hintClue: 'Даже «слабая» сторона выигрывает, специализируясь на менее невыгодном.',
  },
  {
    id: 'ricardo-rent',
    subject: 'рикардо',
    grade: 1,
    question: 'Рента у Рикардо растёт, когда…',
    answers: [
      'В оборот входят худшие земли, а лучшие дают сверхдоход',
      'Отменяют частную собственность',
      'Печатают больше монет',
      'Запрещают хлебный ввоз',
    ],
    correctIndex: 0,
    hintClue: 'Дифференциальная рента — разница плодородия участков.',
  },
  {
    id: 'marx-value',
    subject: 'маркс',
    grade: 1,
    question: 'У Маркса стоимость товара в «Капитале» связана прежде всего с…',
    answers: [
      'Общественно необходимым трудом',
      'Красотой упаковки',
      'Волей короля',
      'Случайной удачей продавца',
    ],
    correctIndex: 0,
    hintClue: 'Трудовая теория стоимости — не путать с субъективной полезностью.',
  },
  {
    id: 'marx-surplus',
    subject: 'маркс',
    grade: 1,
    question: 'Прибавочная стоимость у Маркса — это…',
    answers: [
      'Стоимость, созданная трудом сверх оплаты рабочей силы',
      'Налог на ларёк',
      'Процент банка за кредит',
      'Скидка покупателю',
    ],
    correctIndex: 0,
    hintClue: 'Рабочий день длиннее времени, нужного «окупить» зарплату.',
  },
  {
    id: 'marx-fetish',
    subject: 'маркс',
    grade: 1,
    question: 'Товарный фетишизм у Маркса — когда…',
    answers: [
      'Вещам приписывают отношения, скрывающие труд людей',
      'Люди коллекционируют монеты',
      'Рынок запрещён',
      'Цена равна весу товара',
    ],
    correctIndex: 0,
    hintClue: 'Отношения людей выглядят как свойства самих вещей.',
  },
  {
    id: 'keynes-demand',
    subject: 'кейнс',
    grade: 1,
    question: 'Кейнс в кризис подчёркивал роль…',
    answers: [
      'Совокупного спроса и возможной роли государства',
      'Полного невмешательства любой ценой',
      'Отмены денег',
      'Только золотого стандарта',
    ],
    correctIndex: 0,
    hintClue: '«Общая теория…» — спрос может «зависнуть» ниже полной занятости.',
  },
  {
    id: 'keynes-savings',
    subject: 'кейнс',
    grade: 1,
    question: 'Парадокс бережливости (по Кейнсу) предупреждает, что…',
    answers: [
      'Всеобщее сокращение трат может углубить спад',
      'Копить всегда полезнее тратить',
      'Банки не нужны',
      'Инфляция невозможна',
    ],
    correctIndex: 0,
    hintClue: 'Личная добродетель экономии в кризис может бить по спросу.',
  },
  {
    id: 'hayek-knowledge',
    subject: 'хайек',
    grade: 1,
    question: 'Хайек спорил, что цены важны, потому что…',
    answers: [
      'Передают рассеянное знание о редкости',
      'Всегда равны себестоимости',
      'Их должен фиксировать план',
      'Они не влияют на выбор',
    ],
    correctIndex: 0,
    hintClue: 'Знание размазано по людям; сигнал цены собирает его без штаба.',
  },
  {
    id: 'hayek-road',
    subject: 'хайек',
    grade: 1,
    question: 'В «Дороге к рабству» Хайек предостерегал от…',
    answers: [
      'Центрального планирования, ведущего к несвободе',
      'Любой частной торговли',
      'Разделения труда',
      'Открытых границ для идей',
    ],
    correctIndex: 0,
    hintClue: 'Контроль хозяйства тянет за собой контроль жизни.',
  },
  {
    id: 'malthus-pop',
    subject: 'рынок',
    grade: 1,
    question: 'Мальтус опасался, что население растёт…',
    answers: [
      'Быстрее, чем средства пропитания',
      'Только в городах',
      'Медленнее техники',
      'Лишь по приказу государства',
    ],
    correctIndex: 0,
    hintClue: 'Геометрический рост людей vs арифметический — у пищи.',
  },
  {
    id: 'mill-liberty',
    subject: 'рынок',
    grade: 1,
    question: 'Дж. С. Милль в «О свободе» защищал…',
    answers: [
      'Свободу личности, пока нет вреда другим',
      'Полный запрет мнений',
      'Рабство должников',
      'Единую государственную веру',
    ],
    correctIndex: 0,
    hintClue: 'Принцип вреда: вмешиваться можно, когда задеты другие.',
  },
  {
    id: 'market-price',
    subject: 'рынок',
    grade: 1,
    question: 'На базаре цена «сама» ищет уровень, где…',
    answers: [
      'Спрос и предложение встречаются',
      'Продавец всегда прав',
      'Гость диктует закон',
      'Вес товара не важен',
    ],
    correctIndex: 0,
    hintClue: 'Торг — живой поиск равновесия, не приказ с плаката.',
  },
  {
    id: 'market-haggle',
    subject: 'рынок',
    grade: 1,
    question: 'Торг у ларька ближе всего к идее, что…',
    answers: [
      'Цена — результат обмена оценок сторон',
      'Цена вечна и священна',
      'Деньги не нужны',
      'Покупатель обязан молчать',
    ],
    correctIndex: 0,
    hintClue: 'Оба называют свою готовность платить / отпускать товар.',
  },
  {
    id: 'market-scarce',
    subject: 'рынок',
    grade: 1,
    question: 'Редкость на рынке проявляется как…',
    answers: [
      'Более высокая цена при том же спросе',
      'Бесплатная раздача всего',
      'Запрет выбирать',
      'Отмена очередей законом',
    ],
    correctIndex: 0,
    hintClue: 'Чего мало относительно желаний — то дороже.',
  },
];

/** Level 2 / father — pedagogy theorists. */
export const PEDAGOGY_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'piaget-stages',
    subject: 'пиаже',
    grade: 2,
    question: 'Пиаже описывал развитие мышления как смену…',
    answers: [
      'Стадий (сенсомоторная → формальные операции)',
      'Случайных вспышек без порядка',
      'Только школьных оценок',
      'Приказов директора',
    ],
    correctIndex: 0,
    hintClue: 'Ребёнок не «маленький взрослый» — у стадий своя логика.',
  },
  {
    id: 'piaget-assim',
    subject: 'пиаже',
    grade: 2,
    question: 'Ассимиляция у Пиаже — это когда ребёнок…',
    answers: [
      'Встраивает новое в уже имеющиеся схемы',
      'Полностью стирает прошлый опыт',
      'Копирует только отметки',
      'Отказывается учиться',
    ],
    correctIndex: 0,
    hintClue: 'Новое «подгоняется» под то, что уже понятно.',
  },
  {
    id: 'piaget-accom',
    subject: 'пиаже',
    grade: 2,
    question: 'Аккомодация у Пиаже — это…',
    answers: [
      'Перестройка схем под новый опыт',
      'Заучивание без смысла',
      'Наказание за ошибку',
      'Отказ от вопросов',
    ],
    correctIndex: 0,
    hintClue: 'Схема сама меняется, когда мир «не лезет» в старую.',
  },
  {
    id: 'vygotsky-zpd',
    subject: 'выготский',
    grade: 2,
    question: 'Зона ближайшего развития (Выготский) — это…',
    answers: [
      'То, что ученик делает с помощью, а завтра — сам',
      'Только то, что уже умеет без помощи',
      'Оценки в аттестате',
      'Перемена между уроками',
    ],
    correctIndex: 0,
    hintClue: 'Между «уже сам» и «ещё не может даже с подсказкой».',
  },
  {
    id: 'vygotsky-social',
    subject: 'выготский',
    grade: 2,
    question: 'Выготский подчёркивал, что высшие психические функции…',
    answers: [
      'Сначала социальны, потом становятся внутренними',
      'Рождаются только в одиночестве',
      'Не связаны с речью',
      'Неизменны от рождения',
    ],
    correctIndex: 0,
    hintClue: 'От внешнего диалога — к внутренней речи.',
  },
  {
    id: 'vygotsky-scaffold',
    subject: 'выготский',
    grade: 2,
    question: '«Поддержка» (scaffold) в духе Выготского — это…',
    answers: [
      'Временная помощь взрослого внутри зоны роста',
      'Вечный контроль без отпускания',
      'Запрет ошибаться',
      'Замена ученика учителем навсегда',
    ],
    correctIndex: 0,
    hintClue: 'Помощь снимают, когда ученик держится сам.',
  },
  {
    id: 'dewey-exp',
    subject: 'педагогика',
    grade: 2,
    question: 'Дьюи связывал настоящее обучение с…',
    answers: [
      'Опытом и осмыслением действия',
      'Только зубёжкой параграфа',
      'Молчаливым копированием',
      'Отказом от вопросов',
    ],
    correctIndex: 0,
    hintClue: 'Learning by doing — мысль растёт из дела.',
  },
  {
    id: 'montessori',
    subject: 'педагогика',
    grade: 2,
    question: 'Монтессори делала ставку на…',
    answers: [
      'Подготовленную среду и свободу выбора деятельности',
      'Только фронтальные лекции',
      'Телесные наказания',
      'Единый темп для всех без материалов',
    ],
    correctIndex: 0,
    hintClue: 'Ребёнок выбирает работу; взрослый готовит пространство.',
  },
  {
    id: 'makarenko',
    subject: 'педагогика',
    grade: 2,
    question: 'Макаренко строил воспитание во многом через…',
    answers: [
      'Коллектив и общую ответственность',
      'Полную изоляцию ученика',
      'Отказ от труда',
      'Случайный порядок без правил',
    ],
    correctIndex: 0,
    hintClue: 'Личность растёт в деле коллектива — классика советской педагогики.',
  },
  {
    id: 'ped-dialogue',
    subject: 'педагогика',
    grade: 2,
    question: 'Честный разговор отца и сына о выборе ближе к идее, что…',
    answers: [
      'Смысл рождается в диалоге, а не в приказе',
      'Сыну нельзя иметь голос',
      'Важны только оценки',
      'Вопросы вредны',
    ],
    correctIndex: 0,
    hintClue: 'Педагогика диалога: объяснить «почему», а не заставить молчать.',
  },
];

/** Light general philosophy for levels that still use the rotating quiz deck. */
export const GENERAL_PHILOSOPHY_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'socrates',
    subject: 'философия',
    grade: 3,
    question: 'Сократ славился методом…',
    answers: [
      'Вопросов, выявляющих противоречия в мнении',
      'Молчаливого согласия со всеми',
      'Запрета споров',
      'Только военных приказов',
    ],
    correctIndex: 0,
    hintClue: 'Майевтика — «рождение» мысли через расспрос.',
  },
  {
    id: 'plato-cave',
    subject: 'философия',
    grade: 3,
    question: 'Платонов миф о пещере говорит о…',
    answers: [
      'Тени мнений и пути к подлинному знанию',
      'Строительстве шахт',
      'Запрете света',
      'Торговле факелами',
    ],
    correctIndex: 0,
    hintClue: 'Узники видят тени; философ выходит к солнцу идей.',
  },
  {
    id: 'aristotle-mean',
    subject: 'философия',
    grade: 3,
    question: 'Аристотель о добродетели учил «золотой…»',
    answers: [
      'Середине между крайностями',
      'Монете в храме',
      'Цепи для рабов мысли',
      'Клятве молчать',
    ],
    correctIndex: 0,
    hintClue: 'Мужество — между трусостью и безрассудством.',
  },
  {
    id: 'descartes',
    subject: 'философия',
    grade: 3,
    question: '«Мыслю, следовательно…» у Декарта завершается словом…',
    answers: ['Существую', 'Покупаю', 'Побеждаю', 'Молчу'],
    correctIndex: 0,
    hintClue: 'Cogito ergo sum — опора достоверности.',
  },
  {
    id: 'kant-imperative',
    subject: 'философия',
    grade: 3,
    question: 'Категорический императив Канта требует поступать так, чтобы…',
    answers: [
      'Максима могла стать всеобщим законом',
      'Всегда побеждала выгода',
      'Никто не задавал вопросов',
      'Правила менялись каждый день',
    ],
    correctIndex: 0,
    hintClue: 'Поступай по правилу, которое согласен видеть у всех.',
  },
  {
    id: 'nietzsche',
    subject: 'философия',
    grade: 3,
    question: 'Ницше критиковал «мораль рабов» как…',
    answers: [
      'Переворот ценностей из бессилия и ресентимента',
      'Устав школьной формы',
      'Закон о ценах на рынке',
      'Правила шахмат',
    ],
    correctIndex: 0,
    hintClue: 'Генеалогия морали — откуда взялись «добро» и «зло».',
  },
  {
    id: 'existential',
    subject: 'философия',
    grade: 3,
    question: 'Экзистенциализм (Сартр) настаивает, что…',
    answers: [
      'Существование предшествует сущности: выбор на тебе',
      'Судьбу пишут только звёзды',
      'Выбора не бывает',
      'Ответственность всегда чужая',
    ],
    correctIndex: 0,
    hintClue: 'Человек сначала есть — потом определяет себя поступками.',
  },
  {
    id: 'popper-falsify',
    subject: 'философия',
    grade: 3,
    question: 'Поппер считал научное утверждение тем, что…',
    answers: [
      'Принципиально можно опровергнуть опытом',
      'Никогда нельзя проверить',
      'Верно по приказу',
      'Красиво звучит',
    ],
    correctIndex: 0,
    hintClue: 'Фальсифицируемость — критерий демаркации науки.',
  },
];

/** Default rotating deck for NPC quiz encounters (L3+): general philosophy. */
export const PHILOSOPHY_QUESTIONS: readonly QuizQuestion[] = GENERAL_PHILOSOPHY_QUESTIONS;

/** @deprecated Use PHILOSOPHY_QUESTIONS / MARKET_QUESTIONS. */
export const SCHOOL_QUESTIONS = PHILOSOPHY_QUESTIONS;

/** Shuffle copy of answers; returns new correct index. */
export function shuffleQuestion(
  q: QuizQuestion,
  rng: () => number = Math.random,
): {
  question: string;
  subject: QuizSubject;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  hintClue: string;
  id: string;
} {
  const pairs = q.answers.map((text, i) => ({ text, correct: i === q.correctIndex }));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pairs[i]!;
    pairs[i] = pairs[j]!;
    pairs[j] = tmp;
  }
  const answers = pairs.map((p) => p.text) as [string, string, string, string];
  const correctIndex = pairs.findIndex((p) => p.correct) as 0 | 1 | 2 | 3;
  return {
    id: q.id,
    question: q.question,
    subject: q.subject,
    answers,
    correctIndex,
    hintClue: q.hintClue,
  };
}

type DeckKind = 'general' | 'market';

const decks: Record<DeckKind, { ids: number[]; cursor: number; bank: readonly QuizQuestion[] }> = {
  general: {
    ids: GENERAL_PHILOSOPHY_QUESTIONS.map((_, i) => i),
    cursor: 0,
    bank: GENERAL_PHILOSOPHY_QUESTIONS,
  },
  market: {
    ids: MARKET_QUESTIONS.map((_, i) => i),
    cursor: 0,
    bank: MARKET_QUESTIONS,
  },
};

function reshuffleDeck(kind: DeckKind, rng: () => number): void {
  const d = decks[kind];
  for (let i = d.ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = d.ids[i]!;
    d.ids[i] = d.ids[j]!;
    d.ids[j] = tmp;
  }
  d.cursor = 0;
}

reshuffleDeck('general', Math.random);
reshuffleDeck('market', Math.random);

function nextFromDeck(
  kind: DeckKind,
  rng: () => number = Math.random,
): ReturnType<typeof shuffleQuestion> {
  const d = decks[kind];
  if (d.cursor >= d.ids.length) reshuffleDeck(kind, rng);
  const idx = d.ids[d.cursor]!;
  d.cursor += 1;
  return shuffleQuestion(d.bank[idx]!, rng);
}

/** Next question from the general-philosophy rotating deck (L3+ default). */
export function nextPhilosophyQuestion(
  rng: () => number = Math.random,
): ReturnType<typeof shuffleQuestion> {
  return nextFromDeck('general', rng);
}

/** Next market / economist-philosopher question (L1 theme). */
export function nextMarketQuestion(
  rng: () => number = Math.random,
): ReturnType<typeof shuffleQuestion> {
  return nextFromDeck('market', rng);
}

/** @deprecated Use nextPhilosophyQuestion. */
export function nextSchoolQuestion(
  rng: () => number = Math.random,
): ReturnType<typeof shuffleQuestion> {
  return nextPhilosophyQuestion(rng);
}
