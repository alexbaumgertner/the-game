/**
 * Back-compat re-exports — Sega 16-bit palettes supersede the NES pass.
 * Prefer importing from `./segaPalette` in new code.
 */

export {
  SEGA as NES,
  ADULT_PAL,
  TEEN_PAL,
  APT_PAL,
  RYNOK_PAL,
  SEGA,
} from './segaPalette';
