/**
 * Russian school program quiz bank (grades 6–11).
 * Subjects: math, russian, history, biology, geography, physics, literature.
 */

export type QuizSubject =
  | 'математика'
  | 'русский'
  | 'история'
  | 'биология'
  | 'география'
  | 'физика'
  | 'литература';

export interface SchoolQuestion {
  id: string;
  subject: QuizSubject;
  /** Grade band, informational. */
  grade: number;
  question: string;
  /** Exactly 4 answers; correctIndex points to the right one. */
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  /** Short subject clue shown as a paid hint (not the answer). */
  hintClue: string;
}

export const SCHOOL_QUESTIONS: readonly SchoolQuestion[] = [
  {
    id: 'math-frac',
    subject: 'математика',
    grade: 6,
    question: 'Сколько будет 3/4 + 1/4?',
    answers: ['1', '1/2', '2/4', '3/8'],
    correctIndex: 0,
    hintClue: 'Одинаковые знаменатели — складывай числители.',
  },
  {
    id: 'math-pct',
    subject: 'математика',
    grade: 7,
    question: 'Сколько будет 20% от 150?',
    answers: ['30', '20', '50', '15'],
    correctIndex: 0,
    hintClue: '20% = 1/5 числа.',
  },
  {
    id: 'math-quad',
    subject: 'математика',
    grade: 8,
    question: 'Чему равен дискриминант x² − 5x + 6 = 0?',
    answers: ['1', '25', '11', '0'],
    correctIndex: 0,
    hintClue: 'D = b² − 4ac.',
  },
  {
    id: 'math-sin',
    subject: 'математика',
    grade: 10,
    question: 'sin 90° равен…',
    answers: ['1', '0', '1/2', '√2/2'],
    correctIndex: 0,
    hintClue: 'Синус прямого угла — максимум на окружности.',
  },
  {
    id: 'ru-cases',
    subject: 'русский',
    grade: 6,
    question: 'Сколько падежей в русском языке?',
    answers: ['6', '5', '7', '4'],
    correctIndex: 0,
    hintClue: 'Им., род., дат., вин., твор., предл.',
  },
  {
    id: 'ru-part',
    subject: 'русский',
    grade: 7,
    question: 'Какая часть речи отвечает на вопрос «какой?»?',
    answers: ['Прилагательное', 'Существительное', 'Глагол', 'Наречие'],
    correctIndex: 0,
    hintClue: 'Обозначает признак предмета.',
  },
  {
    id: 'ru-hyphen',
    subject: 'русский',
    grade: 8,
    question: 'Как пишется «по-прежнему» (в значении «как раньше»)?',
    answers: ['Через дефис', 'Слитно', 'Раздельно', 'С заглавной'],
    correctIndex: 0,
    hintClue: 'Наречия с приставкой по- и суффиксом -ему.',
  },
  {
    id: 'ru-ne',
    subject: 'русский',
    grade: 9,
    question: '«Не» с глаголами обычно пишется…',
    answers: ['Раздельно', 'Слитно', 'Через дефис', 'Как угодно'],
    correctIndex: 0,
    hintClue: 'Кроме исключений вроде «нездоровится».',
  },
  {
    id: 'hist-kievan',
    subject: 'история',
    grade: 6,
    question: 'Столица Древней Руси в X–XI вв. — это…',
    answers: ['Киев', 'Новгород', 'Москва', 'Владимир'],
    correctIndex: 0,
    hintClue: 'Город на Днепре, «мать городов русских».',
  },
  {
    id: 'hist-1240',
    subject: 'история',
    grade: 7,
    question: 'Невская битва (1240) связана с именем…',
    answers: ['Александра Невского', 'Дмитрия Донского', 'Ивана Грозного', 'Петра I'],
    correctIndex: 0,
    hintClue: 'Князь победил шведов на Неве.',
  },
  {
    id: 'hist-1812',
    subject: 'история',
    grade: 8,
    question: 'В каком году началась Отечественная война с Наполеоном?',
    answers: ['1812', '1814', '1709', '1853'],
    correctIndex: 0,
    hintClue: 'Бородино — тот же год.',
  },
  {
    id: 'hist-ussr',
    subject: 'история',
    grade: 9,
    question: 'СССР был образован в…',
    answers: ['1922', '1917', '1945', '1939'],
    correctIndex: 0,
    hintClue: 'После Гражданской войны, не в октябре 1917.',
  },
  {
    id: 'bio-cell',
    subject: 'биология',
    grade: 6,
    question: 'Основная единица строения живых организмов — это…',
    answers: ['Клетка', 'Ткань', 'Орган', 'Атом'],
    correctIndex: 0,
    hintClue: 'Её видно в микроскоп; у растений есть стенка.',
  },
  {
    id: 'bio-photo',
    subject: 'биология',
    grade: 7,
    question: 'Фотосинтез у растений происходит в…',
    answers: ['Хлоропластах', 'Митохондриях', 'Ядре', 'Рибосомах'],
    correctIndex: 0,
    hintClue: 'Зелёные органоиды с хлорофиллом.',
  },
  {
    id: 'bio-dna',
    subject: 'биология',
    grade: 10,
    question: 'Носитель наследственной информации — это…',
    answers: ['ДНК', 'Белок', 'Глюкоза', 'АТФ'],
    correctIndex: 0,
    hintClue: 'Двойная спираль Уотсона и Крика.',
  },
  {
    id: 'geo-volkhov',
    subject: 'география',
    grade: 6,
    question: 'Через Великий Новгород протекает река…',
    answers: ['Волхов', 'Нева', 'Волга', 'Днепр'],
    correctIndex: 0,
    hintClue: 'Течёт из Ильменя к Ладоге.',
  },
  {
    id: 'geo-capital',
    subject: 'география',
    grade: 7,
    question: 'Столица России — это…',
    answers: ['Москва', 'Санкт-Петербург', 'Новгород', 'Казань'],
    correctIndex: 0,
    hintClue: 'Город на Москве-реке.',
  },
  {
    id: 'geo-baikal',
    subject: 'география',
    grade: 8,
    question: 'Самое глубокое озеро мира — это…',
    answers: ['Байкал', 'Ладога', 'Каспийское море', 'Онежское'],
    correctIndex: 0,
    hintClue: 'Восточная Сибирь, пресная вода.',
  },
  {
    id: 'geo-ural',
    subject: 'география',
    grade: 9,
    question: 'Уральские горы разделяют…',
    answers: ['Европу и Азию', 'Азию и Африку', 'Европу и Африку', 'Север и Юг'],
    correctIndex: 0,
    hintClue: 'Условная граница частей света в России.',
  },
  {
    id: 'phys-newton',
    subject: 'физика',
    grade: 7,
    question: 'Единица силы в СИ — это…',
    answers: ['Ньютон', 'Джоуль', 'Ватт', 'Паскаль'],
    correctIndex: 0,
    hintClue: 'F = ma; названа в честь Ньютона.',
  },
  {
    id: 'phys-speed',
    subject: 'физика',
    grade: 7,
    question: 'Скорость равномерного движения — это…',
    answers: ['Путь / время', 'Масса × ускорение', 'Сила × путь', 'Работа / время'],
    correctIndex: 0,
    hintClue: 'v = s / t.',
  },
  {
    id: 'phys-ohm',
    subject: 'физика',
    grade: 8,
    question: 'Закон Ома: сила тока равна…',
    answers: ['U / R', 'U × R', 'R / U', 'U + R'],
    correctIndex: 0,
    hintClue: 'Ток прямо пропорционален напряжению.',
  },
  {
    id: 'phys-light',
    subject: 'физика',
    grade: 9,
    question: 'Скорость света в вакууме примерно…',
    answers: ['3·10⁸ м/с', '340 м/с', '3·10⁶ м/с', '1500 м/с'],
    correctIndex: 0,
    hintClue: 'Около 300 000 км/с.',
  },
  {
    id: 'lit-pushkin',
    subject: 'литература',
    grade: 6,
    question: 'Автор «Сказки о рыбаке и рыбке» — это…',
    answers: ['А. С. Пушкин', 'И. А. Крылов', 'Н. В. Гоголь', 'Л. Н. Толстой'],
    correctIndex: 0,
    hintClue: 'Золотая рыбка и старуха у моря.',
  },
  {
    id: 'lit-gogol',
    subject: 'литература',
    grade: 7,
    question: 'Кто написал повесть «Тарас Бульба»?',
    answers: ['Н. В. Гоголь', 'А. С. Пушкин', 'М. Ю. Лермонтов', 'И. С. Тургенев'],
    correctIndex: 0,
    hintClue: 'Автор «Мёртвых душ» и «Вечеров…».',
  },
  {
    id: 'lit-lermontov',
    subject: 'литература',
    grade: 8,
    question: 'Автор романа «Герой нашего времени» — это…',
    answers: ['М. Ю. Лермонтов', 'А. С. Пушкин', 'Ф. М. Достоевский', 'А. П. Чехов'],
    correctIndex: 0,
    hintClue: 'Печорин — главный герой.',
  },
  {
    id: 'lit-tolstoy',
    subject: 'литература',
    grade: 10,
    question: 'Роман-эпопея «Война и мир» написал…',
    answers: ['Л. Н. Толстой', 'Ф. М. Достоевский', 'И. С. Тургенев', 'А. Н. Островский'],
    correctIndex: 0,
    hintClue: 'Бородино, Наташа Ростова, Пьер Безухов.',
  },
  {
    id: 'lit-dosto',
    subject: 'литература',
    grade: 11,
    question: 'Автор романа «Преступление и наказание» — это…',
    answers: ['Ф. М. Достоевский', 'Л. Н. Толстой', 'А. П. Чехов', 'М. А. Булгаков'],
    correctIndex: 0,
    hintClue: 'Раскольников и старуха-процентщица.',
  },
  {
    id: 'math-sqrt',
    subject: 'математика',
    grade: 8,
    question: '√81 равно…',
    answers: ['9', '8', '41', '18'],
    correctIndex: 0,
    hintClue: 'Какой квадрат даёт 81?',
  },
  {
    id: 'hist-novgorod',
    subject: 'история',
    grade: 6,
    question: 'Вече в средневековом Новгороде — это…',
    answers: ['Народное собрание', 'Княжеский дворец', 'Торговый налог', 'Военный отряд'],
    correctIndex: 0,
    hintClue: 'Собирались у Софии или на Ярославовом дворище.',
  },
];

/** Shuffle copy of answers; returns new correct index. */
export function shuffleQuestion(q: SchoolQuestion, rng: () => number = Math.random): {
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

let deckCursor = 0;
const deckIds = SCHOOL_QUESTIONS.map((_, i) => i);

function reshuffleDeck(rng: () => number): void {
  for (let i = deckIds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deckIds[i]!;
    deckIds[i] = deckIds[j]!;
    deckIds[j] = tmp;
  }
  deckCursor = 0;
}

reshuffleDeck(Math.random);

/** Next unique-ish question from a shuffled rotating deck. */
export function nextSchoolQuestion(rng: () => number = Math.random): ReturnType<typeof shuffleQuestion> {
  if (deckCursor >= deckIds.length) reshuffleDeck(rng);
  const idx = deckIds[deckCursor]!;
  deckCursor += 1;
  return shuffleQuestion(SCHOOL_QUESTIONS[idx]!, rng);
}
