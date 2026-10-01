/**
 * NES-inspired limited palettes for Novgorod 1995.
 * ~4 colors per sprite / cohesive scene palettes — no true NES PPU,
 * but hex values stay in a classic 8-bit range.
 */

/** Shared ink / outline used across eras. */
export const NES = {
  black: '#0f0f1b',
  white: '#fcfcfc',
  softWhite: '#e8e8e8',
  gray: '#7c7c7c',
  darkGray: '#3c3c3c',
} as const;

/** Adult 2026 — warm lamp / gold silhouette. */
export const ADULT_PAL = {
  outline: NES.black,
  skin: '#d4a574',
  skinShadow: '#a87848',
  hair: '#5a3a28',
  shirt: '#c4a040',
  shirtDark: '#8a6820',
  pants: '#3a4a68',
  pantsDark: '#243048',
  shoes: '#2a2018',
} as const;

/** Teen 1995 — cooler winter / cyan accent. */
export const TEEN_PAL = {
  outline: NES.black,
  skin: '#e8c898',
  skinShadow: '#c4a068',
  hair: '#2a2838',
  shirt: '#4a90b8',
  shirtDark: '#2a6080',
  pants: '#3a4860',
  pantsDark: '#243040',
  shoes: '#1a1820',
  scarf: '#c04040',
} as const;

/** 2026 Khrushchyovka apartment. */
export const APT_PAL = {
  wallBase: '#3a3848',
  wallDark: '#2a2838',
  wallpaper: '#4a4860',
  wallpaperDot: '#5a5870',
  floor: '#5a4838',
  floorLight: '#6a5848',
  floorDark: '#3a3028',
  wood: '#6a5040',
  woodDark: '#4a3828',
  woodLight: '#8a7060',
  bedSheet: '#6a6a88',
  bedBlanket: '#8a4a58',
  pillow: '#c8c0d0',
  curtain: '#4a3860',
  curtainLight: '#6a5880',
  nightSky: '#0e1220',
  city: '#1a2030',
  cityMid: '#2a3048',
  windowLight: '#e8c56a',
  frame: '#8a7040',
  frameInner: '#c8b080',
  photoSky: '#a09070',
  photoStall: '#6a5848',
  photoSnow: '#d8d0c0',
  diaryLocked: '#2a2028',
  diaryOpen: '#8b4518',
  diaryPages: '#d4c4a0',
  brass: '#c4a040',
  brassDim: '#6a5820',
  plant: '#3a6a3a',
  plantPot: '#6a4838',
  lampGlow: '#e8c56a',
  uiBox: '#101018',
  uiBorder: '#e8c56a',
  uiText: '#fcfcfc',
  uiMuted: '#a0a0b0',
} as const;

/** 1995 winter rynok. */
export const RYNOK_PAL = {
  skyTop: '#1a2238',
  skyMid: '#2a3850',
  skyLow: '#3a4860',
  brick: '#8a5040',
  brickDark: '#6a3828',
  brickLight: '#a86858',
  concrete: '#687078',
  concreteDark: '#485058',
  snow: '#e8eef4',
  snowMid: '#c8d0d8',
  snowShadow: '#a0a8b0',
  wood: '#6a5038',
  woodDark: '#4a3828',
  awningRed: '#a83030',
  awningDark: '#781818',
  awningStripe: '#e8e4d8',
  fish: '#6890a8',
  bread: '#c4a040',
  fur: '#8a6848',
  greens: '#4a8848',
  gate: '#4a3828',
  roof: '#3a4050',
  roofSnow: '#d0d8e0',
  uiBox: '#101820',
  uiBorder: '#6ec6ff',
  uiText: '#e8eef4',
} as const;
