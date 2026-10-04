/**
 * Sega Genesis / Mega Drive–inspired palettes for Novgorod 1995.
 * ~8–16 colors per sprite / scene — denser than the NES pass, still
 * cohesive hex ranges (not a strict VDP clone).
 */

/** Shared ink / outline / UI whites. */
export const SEGA = {
  black: '#0c0c14',
  ink: '#181828',
  white: '#f8f8f8',
  softWhite: '#e0e0e8',
  gray: '#888898',
  darkGray: '#484858',
  midGray: '#686878',
} as const;

/**
 * Adult 2026 — Mega Drive sprite budget: ≤15 unique hexes.
 * 3 tones per material (skin / shirt / pants) + outline + accents.
 * (likeness from media/player-reference-photo.png, pixel face).
 */
const A_OUT = '#000000';
const A_SK_HI = '#fce8d0';
const A_SK = '#f0d0b0';
const A_SK_MID = '#d8b090';
const A_SK_SH = '#b88868';
const A_SH_HI = '#4a5870';
const A_SH = '#2a3850';
const A_SH_DK = '#101820';
const A_PN_HI = '#6a7a98';
const A_PN = '#4a5a78';
const A_PN_DK = '#344058';
const A_SHOE = '#322820';
const A_EYE = '#d0dce8';
const A_WHITE = '#f0f4f8';
const A_LIP = '#d09088';

export const ADULT_PAL = {
  outline: A_OUT,
  skinHi: A_SK_HI,
  skin: A_SK,
  skinMid: A_SK_MID,
  skinShadow: A_SK_SH,
  /** Kept for compat; bald — scalp uses skin ramp. */
  hairHi: A_SK_HI,
  hair: A_SK,
  hairDark: A_SK_MID,
  /** Dark navy / charcoal crew sweatshirt. */
  shirtHi: A_SH_HI,
  shirt: A_SH,
  shirtMid: A_SH_DK,
  shirtDark: A_SH_DK,
  pantsHi: A_PN_HI,
  pants: A_PN,
  pantsDark: A_PN_DK,
  pantsInk: A_SH_DK,
  shoes: A_SHOE,
  shoesHi: A_PN_DK,
  belt: A_PN_DK,
  beltDark: A_SH_DK,
  /** Light chest tag on sweatshirt. */
  tag: A_SH_HI,
  eye: A_EYE,
  eyeWhite: A_WHITE,
  pupil: A_OUT,
  teeth: A_WHITE,
  lip: A_LIP,
  brow: A_SK_MID,
  ear: A_SK,
} as const;

/**
 * Teen 1995 — same MD budget (≤15 unique), younger proportions.
 * Scarf keys alias lip / shirt for HUD chrome without blowing the budget.
 */
const T_OUT = '#000000';
const T_SK_HI = '#fcecd8';
const T_SK = '#f4d8b8';
const T_SK_MID = '#dcc098';
const T_SK_SH = '#c09870';
const T_SH_HI = '#4a5870';
const T_SH = '#2a3850';
const T_SH_DK = '#101820';
const T_PN_HI = '#687888';
const T_PN = '#4a5868';
const T_PN_DK = '#344050';
const T_SHOE = '#222028';
const T_EYE = '#d8e0e8';
const T_WHITE = '#f0f4f8';
const T_LIP = '#d89890';

export const TEEN_PAL = {
  outline: T_OUT,
  skinHi: T_SK_HI,
  skin: T_SK,
  skinMid: T_SK_MID,
  skinShadow: T_SK_SH,
  hairHi: T_SK_HI,
  hair: T_SK,
  hairDark: T_SK_MID,
  shirtHi: T_SH_HI,
  shirt: T_SH,
  shirtMid: T_SH_DK,
  shirtDark: T_SH_DK,
  pantsHi: T_PN_HI,
  pants: T_PN,
  pantsDark: T_PN_DK,
  pantsInk: T_SH_DK,
  shoes: T_SHOE,
  shoesHi: T_PN_DK,
  scarfHi: T_LIP,
  scarf: T_LIP,
  scarfDark: T_SH_DK,
  tag: T_SH_HI,
  eye: T_EYE,
  eyeWhite: T_WHITE,
  pupil: T_OUT,
  teeth: T_WHITE,
  lip: T_LIP,
  brow: T_SK_MID,
  ear: T_SK,
} as const;

/**
 * Mom (Рынок МЕХА) — winter coat + headscarf, ≤15 unique hexes.
 */
const M_OUT = '#000000';
const M_SK_HI = '#f0d0b0';
const M_SK = '#d0a878';
const M_SK_SH = '#a87858';
const M_COAT_HI = '#8a6850';
const M_COAT = '#6a4838';
const M_COAT_DK = '#4a3020';
const M_FUR_HI = '#e0c090';
const M_FUR = '#c8a070';
const M_FUR_DK = '#a08060';
const M_SCARF = '#4a3040';
const M_SCARF_DK = '#3a2830';
const M_SKIRT = '#3a3048';
const M_BOOT = '#18141c';
const M_WHITE = '#f0e0c0';

export const MOM_PAL = {
  outline: M_OUT,
  skinHi: M_SK_HI,
  skin: M_SK,
  skinShadow: M_SK_SH,
  coatHi: M_COAT_HI,
  coat: M_COAT,
  coatDark: M_COAT_DK,
  furHi: M_FUR_HI,
  fur: M_FUR,
  furDark: M_FUR_DK,
  scarf: M_SCARF,
  scarfDark: M_SCARF_DK,
  skirt: M_SKIRT,
  boots: M_BOOT,
  eyeWhite: M_WHITE,
  pupil: M_OUT,
  lip: M_SK_SH,
  tear: M_WHITE,
} as const;

/** Ginger cat — multi-shade fur for readable drawn look. */
export const CAT_PAL = {
  outline: '#3a2010',
  furHi: '#f8b070',
  fur: '#e07828',
  furMid: '#c06020',
  furDark: '#8a4018',
  stripe: '#6a3010',
  belly: '#f0c898',
  eye: '#203820',
  eyeHi: '#d0e870',
  nose: '#d04040',
  noseHi: '#f07070',
  innerEar: '#f8a090',
  whisker: '#f0e0d0',
} as const;

/** 2026 Khrushchyovka apartment — wallpaper motifs, bevelled furniture. */
export const APT_PAL = {
  // Midtones lifted ~1 step for contrast under softer ambient multiply
  wallBase: '#484668',
  wallDark: '#323248',
  wallDeep: '#222236',
  wallpaper: '#585878',
  wallpaperDot: '#6a6890',
  wallpaperMotif: '#7a78b0',
  wallpaperShadow: '#3c3a58',
  wallStainDeep: '#4a3828',
  wallStainMid: '#5a4838',
  wallStainEdge: '#6a5848',
  wallFloral: '#8a6878',
  wallFloralLeaf: '#5a7860',
  floor: '#6a5848',
  floorLight: '#8a7860',
  floorMid: '#7a6858',
  floorDark: '#423830',
  floorGrain: '#524038',
  wood: '#7a6050',
  woodHi: '#aa9080',
  woodMid: '#9a8070',
  woodDark: '#524030',
  woodDeep: '#322820',
  woodKnot: '#3a2818',
  bedSheet: '#7a7aa0',
  bedSheetHi: '#9a9ac0',
  bedBlanket: '#9a5a68',
  bedBlanketHi: '#c07080',
  bedBlanketDark: '#6a3848',
  pillow: '#d8d0e0',
  pillowHi: '#f0e8f0',
  pillowShadow: '#a8a0b8',
  curtain: '#5a4878',
  curtainHi: '#8a78b0',
  curtainDark: '#322858',
  curtainFold: '#6a5890',
  nightSky: '#0c1420',
  nightSkyMid: '#182030',
  city: '#222840',
  cityMid: '#344860',
  cityHi: '#4a5878',
  windowLight: '#f0d070',
  windowLightDim: '#a88840',
  frame: '#9a8050',
  frameHi: '#d0b880',
  frameDark: '#6a5830',
  frameInner: '#d8c098',
  photoSky: '#b8a880',
  photoSkyHi: '#d0c0a0',
  photoStall: '#7a6858',
  photoSnow: '#e8e0d0',
  diaryLocked: '#2a2028',
  diaryLockedHi: '#4a4048',
  diaryOpen: '#8b4518',
  diaryOpenHi: '#b06030',
  diaryPages: '#e0d0b0',
  diaryInk: '#4a3828',
  brass: '#d4b050',
  brassHi: '#f0d880',
  brassDim: '#6a5820',
  plant: '#3a7a3a',
  plantHi: '#5aaa5a',
  plantDark: '#2a5a2a',
  plantPot: '#6a4838',
  plantPotHi: '#8a6850',
  lampGlow: '#f0d070',
  lampGlowDim: '#c8a848',
  // HUD chrome untouched — stays crisp over softer scene wash
  uiBox: '#101018',
  uiBoxHi: '#282838',
  uiBorder: '#e8c858',
  uiBorderDark: '#8a6820',
  uiText: '#f8f8f8',
  uiMuted: '#a0a0b8',
} as const;

/** 1995 winter rynok — Central Market glass hall, kiosks, snow. */
export const RYNOK_PAL = {
  // Winter dusk / neo-noir sky — cool mid bands for midtone contrast
  skyTop: '#141c30',
  skyHi: '#1c2840',
  skyMid: '#304860',
  skyLow: '#446078',
  skyHorizon: '#5a7888',
  // Central Market hall
  hallRoof: '#8a98a8',
  hallRoofHi: '#c0c8d0',
  hallRoofDark: '#5a6878',
  hallFrame: '#2a5088',
  hallFrameHi: '#3a70b0',
  hallFrameDark: '#1a3860',
  hallGlass: '#284868',
  hallGlassHi: '#3a6888',
  hallGlassLit: '#6898b8',
  hallGlassDeep: '#183048',
  hallBanner: '#1a4890',
  hallBannerHi: '#2a68b8',
  hallBannerDark: '#103068',
  hallSign: '#f0f4f8',
  // Low wall / street furniture
  brick: '#9a6050',
  brickHi: '#c88070',
  brickMid: '#aa6858',
  brickDark: '#6a4038',
  brickDeep: '#422820',
  mortar: '#5a4840',
  concrete: '#788088',
  concreteHi: '#98a0a8',
  concreteDark: '#586068',
  fence: '#2a5898',
  fenceHi: '#3a78c0',
  fenceDark: '#1a3868',
  snow: '#f0f4f8',
  snowHi: '#ffffff',
  snowMid: '#d0d8e0',
  snowShadow: '#a8b0b8',
  snowDeep: '#788088',
  wood: '#7a6048',
  woodHi: '#aa8868',
  woodDark: '#5a4838',
  woodDeep: '#322820',
  // Corrugated kiosks (period stalls)
  kioskGrey: '#687078',
  kioskGreyHi: '#889098',
  kioskGreyDark: '#485058',
  kioskTan: '#8a7860',
  kioskTanHi: '#aa9878',
  kioskTanDark: '#5a4838',
  kioskRust: '#785040',
  kioskRustHi: '#986858',
  kioskRustDark: '#483028',
  kioskBlue: '#3860a0',
  kioskBlueHi: '#5880c0',
  kioskBlueDark: '#204078',
  awningRed: '#c84848',
  awningRedHi: '#e87070',
  awningDark: '#781828',
  awningBlue: '#4870b8',
  awningBlueHi: '#6890d0',
  awningBlueDark: '#284878',
  awningBrown: '#b07840',
  awningBrownHi: '#d89860',
  awningBrownDark: '#784028',
  awningStripe: '#f0ece0',
  fish: '#789fb8',
  fishHi: '#a0c8d8',
  fishDark: '#507888',
  bread: '#d4b050',
  breadHi: '#f0d878',
  breadDark: '#9a7830',
  fur: '#9a7858',
  furHi: '#c8a078',
  furDark: '#6a5040',
  greens: '#5a9858',
  greensHi: '#78b878',
  crate: '#6a5840',
  crateHi: '#8a7858',
  crateDark: '#423028',
  crateOrange: '#c06830',
  gate: '#5a4838',
  gateHi: '#7a6850',
  roof: '#3a4860',
  roofMid: '#4a5870',
  roofSnow: '#e0e8f0',
  street: '#686870',
  streetHi: '#808088',
  streetDark: '#484850',
  // HUD chrome untouched
  uiBox: '#081018',
  uiBoxHi: '#182838',
  uiBorder: '#70d0ff',
  uiBorderDark: '#2870a0',
  uiText: '#e8eef4',
} as const;

/** 1995 Khrushchyovka entrance / stairwell — peeling paint, dim bulbs. */
export const PODEZD_PAL = {
  wall: '#6a6058',
  wallHi: '#8a8070',
  wallDark: '#4a4038',
  wallPeel: '#9a8870',
  plaster: '#a09888',
  plasterDark: '#787060',
  brick: '#8a5848',
  brickHi: '#aa7060',
  brickDark: '#5a3830',
  mortar: '#5a5048',
  floor: '#4a4840',
  floorHi: '#686860',
  floorDark: '#2a2820',
  stair: '#5a5848',
  stairHi: '#7a7868',
  stairDark: '#3a3830',
  rail: '#3a4048',
  railHi: '#687078',
  railDark: '#1a2028',
  mailbox: '#4a5860',
  mailboxHi: '#6a7880',
  mailboxDark: '#2a3840',
  door: '#5a4030',
  doorHi: '#7a5840',
  doorDark: '#3a2818',
  doorNum: '#c8a050',
  bulb: '#f0e0a0',
  bulbDim: '#c8a868',
  smoke: '#787870',
  snow: '#e8ecf0',
  snowMid: '#c8d0d8',
  night: '#101820',
  nightMid: '#1a2838',
  uiBox: '#081018',
  uiBoxHi: '#182838',
  uiBorder: '#d0a858',
  uiBorderDark: '#806028',
  uiText: '#f0e8d8',
} as const;

/** 1995 winter train station — platform / waiting hall. */
export const VOKZAL_PAL = {
  skyTop: '#101828',
  skyMid: '#243848',
  skyLow: '#3a5868',
  hall: '#4a5868',
  hallHi: '#6a7888',
  hallDark: '#2a3848',
  glass: '#3a6888',
  glassHi: '#68a0c0',
  platform: '#686870',
  platformHi: '#888890',
  platformDark: '#484850',
  snow: '#e8eef4',
  snowMid: '#c8d0d8',
  snowDeep: '#889098',
  rail: '#3a4048',
  railHi: '#687078',
  train: '#2a3038',
  trainHi: '#4a5058',
  trainWin: '#f0c868',
  luggage: '#6a5040',
  luggageHi: '#9a7858',
  luggageDark: '#3a2818',
  bench: '#5a4838',
  benchHi: '#7a6850',
  sign: '#c84848',
  signText: '#f0f0e8',
  bulb: '#f0e0a0',
  uiBorder: '#70d0ff',
  uiText: '#e8eef4',
} as const;

/** 1995 garage row — metal boxes, tarp cars, dim bulbs. */
export const GARAZHI_PAL = {
  skyTop: '#0c1018',
  skyMid: '#1a2430',
  skyLow: '#2a3848',
  metal: '#5a6068',
  metalHi: '#8a9098',
  metalDark: '#3a4048',
  rust: '#785040',
  rustHi: '#986858',
  door: '#4a5058',
  doorHi: '#6a7078',
  doorDark: '#2a3038',
  tarp: '#3a5840',
  tarpHi: '#5a7860',
  tarpDark: '#243828',
  car: '#2a3040',
  carHi: '#4a5060',
  ground: '#3a3830',
  groundHi: '#5a5848',
  snow: '#d8e0e8',
  snowMid: '#a8b0b8',
  crate: '#6a5840',
  crateHi: '#8a7858',
  crateDark: '#423028',
  bulb: '#e8c868',
  bulbDim: '#a88840',
  wire: '#2a2820',
  uiBorder: '#d0a858',
  uiText: '#f0e8d8',
} as const;

/** 1995 courtyard / roof — laundry, dishes, brick yard. */
export const DVOR_PAL = {
  skyTop: '#141c2c',
  skyMid: '#2a3a50',
  skyLow: '#4a6880',
  brick: '#8a5848',
  brickHi: '#aa7060',
  brickDark: '#5a3830',
  mortar: '#5a5048',
  snow: '#e0e8f0',
  snowMid: '#b8c0c8',
  yard: '#4a4840',
  yardHi: '#686860',
  yardDark: '#2a2820',
  laundry: '#d0d8e0',
  laundryBlue: '#6888b0',
  laundryPink: '#c88898',
  line: '#3a3830',
  dish: '#687078',
  dishHi: '#a0a8b0',
  roof: '#3a4048',
  roofHi: '#5a6068',
  roofSnow: '#e8eef4',
  windowLit: '#e8c868',
  windowDark: '#1a2030',
  uiBorder: '#c8a858',
  uiText: '#f0e8d8',
} as const;

/** 1995 Volkhov bridge — ice river, lamps, Detinets silhouette. */
export const MOST_PAL = {
  skyTop: '#0c1828',
  skyMid: '#1a3048',
  skyLow: '#3a5870',
  ice: '#a8c8d8',
  iceHi: '#d0e8f0',
  iceDark: '#688898',
  water: '#284858',
  waterHi: '#3a6880',
  deck: '#5a5850',
  deckHi: '#7a7870',
  deckDark: '#3a3830',
  rail: '#3a4048',
  railHi: '#687078',
  snow: '#e8eef4',
  snowMid: '#b8c8d0',
  lamp: '#e8d080',
  lampDim: '#a88840',
  post: '#2a3038',
  stone: '#687078',
  stoneHi: '#889098',
  stoneDark: '#404850',
  kremlin: '#1a2430',
  kremlinHi: '#2a3848',
  envelope: '#e8d8b0',
  envelopeHi: '#f8f0d8',
  envelopeDark: '#a89870',
  uiBorder: '#70c0e8',
  uiText: '#e8f0f8',
} as const;

/** 1995 disco «Орбита» — neon, checkers, mirror ball. */
export const DISKO_PAL = {
  skyTop: '#100818',
  skyMid: '#201028',
  skyLow: '#301838',
  wall: '#2a1830',
  wallHi: '#4a2850',
  wallDark: '#180c20',
  neonPink: '#e84898',
  neonCyan: '#48e8e0',
  neonYellow: '#e8d048',
  neonViolet: '#9848e8',
  floorDark: '#1a1420',
  floorLite: '#3a2848',
  floorHi: '#5a4068',
  speaker: '#2a2830',
  speakerHi: '#4a4850',
  speakerCone: '#686070',
  ball: '#d0d8e0',
  ballHi: '#f0f4f8',
  ballDark: '#687078',
  bar: '#3a2820',
  barHi: '#5a4030',
  cassette: '#2a3040',
  cassetteHi: '#4a5060',
  cassetteWin: '#68a0c0',
  uiBorder: '#e84898',
  uiText: '#f0e8f8',
} as const;

/** 1995 Detinets walls — kremlin brick, Sofia silhouette, snow. */
export const DETINETS_PAL = {
  skyTop: '#0c1424',
  skyMid: '#1c2c44',
  skyLow: '#3a5070',
  brick: '#8a5040',
  brickHi: '#aa6850',
  brickDark: '#5a3028',
  mortar: '#5a4840',
  snow: '#e0e8f0',
  snowMid: '#b0b8c0',
  stone: '#687078',
  stoneHi: '#889098',
  stoneDark: '#404850',
  wallWalk: '#4a4840',
  wallWalkHi: '#6a6860',
  dome: '#c84840',
  domeHi: '#e86858',
  domeDark: '#882828',
  cross: '#e8d080',
  windowLit: '#e8c868',
  windowDark: '#1a2030',
  tree: '#1a3020',
  treeHi: '#2a4830',
  uiBorder: '#e8c070',
  uiText: '#f0e8d8',
} as const;

/** Back-compat aliases used by older import sites. */
export const NES = SEGA;
