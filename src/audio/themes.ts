/**
 * Original scene themes — procedural Mega Drive–style loops.
 * No third-party melodies; square / triangle / noise only.
 */

import type { Pattern } from './sequencer';

export type ThemeId =
  | 'apartment'
  | 'market'
  | 'stairwell'
  | 'station'
  | 'garages'
  | 'yard'
  | 'bridge'
  | 'disco'
  | 'detinets'
  | 'army'
  | 'rehab'
  | 'krug'
  | 'finale';

/** Map SceneId-ish names to theme ids when convenient. */
export const SCENE_THEME: Record<string, ThemeId> = {
  apartment_2026: 'apartment',
  rynok_1995: 'market',
  podezd_1995: 'stairwell',
  vokzal_1995: 'station',
  garazhi_1995: 'garages',
  dvor_1995: 'yard',
  most_1995: 'bridge',
  diskoteka_1995: 'disco',
  detinets_1995: 'detinets',
  armiya_2010: 'army',
  rehab_2015: 'rehab',
  krug_2015: 'krug',
  finale_2026: 'finale',
};

const R = { kind: 'rest' as const };

export function themePattern(id: ThemeId, finalePhase = 0): Pattern {
  switch (id) {
    case 'apartment':
      // Quiet soft pads — low triangle, slow.
      return {
        bpm: 72,
        tracks: [
          {
            gain: 0.7,
            notes: [
              { kind: 'tone', midi: 48, steps: 8, type: 'triangle', gain: 0.045 },
              { kind: 'tone', midi: 55, steps: 8, type: 'triangle', gain: 0.04 },
              { kind: 'tone', midi: 52, steps: 8, type: 'triangle', gain: 0.042 },
              { kind: 'tone', midi: 50, steps: 8, type: 'triangle', gain: 0.038 },
            ],
          },
          {
            gain: 0.35,
            notes: [
              R,
              R,
              R,
              R,
              { kind: 'tone', midi: 72, steps: 2, type: 'triangle', gain: 0.025 },
              R,
              R,
              { kind: 'tone', midi: 67, steps: 2, type: 'triangle', gain: 0.022 },
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
            ],
          },
        ],
      };

    case 'market':
      return {
        bpm: 118,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 60, steps: 2, type: 'square', gain: 0.055 },
              { kind: 'tone', midi: 64, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 67, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 64, steps: 2, type: 'square', gain: 0.048 },
              { kind: 'tone', midi: 62, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 65, steps: 2, type: 'square', gain: 0.048 },
              { kind: 'tone', midi: 69, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 65, steps: 2, type: 'square', gain: 0.045 },
            ],
          },
          {
            gain: 0.55,
            notes: [
              { kind: 'tone', midi: 36, steps: 4, type: 'triangle', gain: 0.05 },
              { kind: 'tone', midi: 36, steps: 4, type: 'triangle', gain: 0.045 },
              { kind: 'tone', midi: 38, steps: 4, type: 'triangle', gain: 0.05 },
              { kind: 'tone', midi: 36, steps: 4, type: 'triangle', gain: 0.045 },
            ],
          },
          {
            gain: 0.4,
            notes: [
              { kind: 'noise', steps: 1, gain: 0.02, filterFreq: 2400 },
              R,
              { kind: 'noise', steps: 1, gain: 0.015, filterFreq: 1800 },
              R,
              { kind: 'noise', steps: 1, gain: 0.02, filterFreq: 2400 },
              R,
              { kind: 'noise', steps: 1, gain: 0.025, filterFreq: 1600 },
              R,
            ],
          },
        ],
      };

    case 'stairwell':
      return {
        bpm: 88,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 50, steps: 4, type: 'square', gain: 0.04 },
              R,
              { kind: 'tone', midi: 53, steps: 4, type: 'square', gain: 0.038 },
              R,
              { kind: 'tone', midi: 48, steps: 4, type: 'square', gain: 0.036 },
              R,
              { kind: 'tone', midi: 55, steps: 2, type: 'square', gain: 0.034 },
              { kind: 'tone', midi: 53, steps: 2, type: 'square', gain: 0.032 },
              R,
              R,
            ],
          },
        ],
      };

    case 'station':
      return {
        bpm: 96,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 45, steps: 8, type: 'triangle', gain: 0.05 },
              { kind: 'tone', midi: 47, steps: 8, type: 'triangle', gain: 0.045 },
              { kind: 'tone', midi: 48, steps: 8, type: 'triangle', gain: 0.048 },
              { kind: 'tone', midi: 43, steps: 8, type: 'triangle', gain: 0.042 },
            ],
          },
          {
            gain: 0.45,
            notes: [
              R,
              R,
              R,
              { kind: 'tone', midi: 69, steps: 1, type: 'square', gain: 0.03 },
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              { kind: 'tone', midi: 72, steps: 1, type: 'square', gain: 0.028 },
              R,
              R,
              R,
              R,
            ],
          },
        ],
      };

    case 'garages':
      return {
        bpm: 104,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 40, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 40, steps: 2, type: 'square', gain: 0.035 },
              { kind: 'tone', midi: 43, steps: 2, type: 'square', gain: 0.048 },
              { kind: 'tone', midi: 40, steps: 2, type: 'square', gain: 0.035 },
              { kind: 'tone', midi: 38, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 38, steps: 2, type: 'square', gain: 0.035 },
              { kind: 'tone', midi: 41, steps: 2, type: 'square', gain: 0.045 },
              { kind: 'tone', midi: 38, steps: 2, type: 'square', gain: 0.032 },
            ],
          },
          {
            gain: 0.7,
            notes: [
              { kind: 'noise', steps: 1, gain: 0.035, filterFreq: 900 },
              R,
              R,
              { kind: 'noise', steps: 1, gain: 0.025, filterFreq: 1400 },
              { kind: 'noise', steps: 1, gain: 0.035, filterFreq: 900 },
              R,
              { kind: 'noise', steps: 1, gain: 0.03, filterFreq: 1100 },
              R,
            ],
          },
        ],
      };

    case 'yard':
      return {
        bpm: 100,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 55, steps: 4, type: 'triangle', gain: 0.045 },
              R,
              { kind: 'tone', midi: 59, steps: 2, type: 'triangle', gain: 0.04 },
              { kind: 'tone', midi: 62, steps: 2, type: 'triangle', gain: 0.038 },
              R,
              R,
              { kind: 'tone', midi: 57, steps: 4, type: 'triangle', gain: 0.042 },
              R,
              R,
              R,
            ],
          },
        ],
      };

    case 'bridge':
      return {
        bpm: 92,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 52, steps: 6, type: 'triangle', gain: 0.05 },
              { kind: 'tone', midi: 55, steps: 6, type: 'triangle', gain: 0.046 },
              { kind: 'tone', midi: 57, steps: 6, type: 'triangle', gain: 0.048 },
              { kind: 'tone', midi: 54, steps: 6, type: 'triangle', gain: 0.044 },
            ],
          },
          {
            gain: 0.4,
            notes: [
              R,
              R,
              { kind: 'tone', midi: 76, steps: 2, type: 'square', gain: 0.028 },
              R,
              R,
              R,
              { kind: 'tone', midi: 74, steps: 2, type: 'square', gain: 0.026 },
              R,
              R,
              R,
              { kind: 'tone', midi: 79, steps: 2, type: 'square', gain: 0.027 },
              R,
            ],
          },
        ],
      };

    case 'disco':
      return {
        bpm: 128,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 64, steps: 1, type: 'square', gain: 0.055 },
              { kind: 'tone', midi: 67, steps: 1, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 71, steps: 1, type: 'square', gain: 0.052 },
              { kind: 'tone', midi: 67, steps: 1, type: 'square', gain: 0.048 },
              { kind: 'tone', midi: 64, steps: 1, type: 'square', gain: 0.055 },
              { kind: 'tone', midi: 69, steps: 1, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 72, steps: 1, type: 'square', gain: 0.052 },
              { kind: 'tone', midi: 69, steps: 1, type: 'square', gain: 0.048 },
            ],
          },
          {
            gain: 0.65,
            notes: [
              { kind: 'tone', midi: 40, steps: 2, type: 'triangle', gain: 0.055 },
              { kind: 'tone', midi: 40, steps: 2, type: 'triangle', gain: 0.04 },
              { kind: 'tone', midi: 45, steps: 2, type: 'triangle', gain: 0.055 },
              { kind: 'tone', midi: 40, steps: 2, type: 'triangle', gain: 0.04 },
            ],
          },
          {
            gain: 0.5,
            notes: [
              { kind: 'noise', steps: 1, gain: 0.028, filterFreq: 2800 },
              R,
              { kind: 'noise', steps: 1, gain: 0.04, filterFreq: 1200 },
              R,
            ],
          },
        ],
      };

    case 'detinets':
      return {
        bpm: 78,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 50, steps: 8, type: 'triangle', gain: 0.05 },
              { kind: 'tone', midi: 53, steps: 8, type: 'triangle', gain: 0.048 },
              { kind: 'tone', midi: 55, steps: 8, type: 'triangle', gain: 0.05 },
              { kind: 'tone', midi: 48, steps: 8, type: 'triangle', gain: 0.046 },
            ],
          },
          {
            gain: 0.35,
            notes: [
              R,
              R,
              R,
              R,
              { kind: 'tone', midi: 74, steps: 4, type: 'square', gain: 0.03 },
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              { kind: 'tone', midi: 72, steps: 4, type: 'square', gain: 0.028 },
              R,
              R,
              R,
            ],
          },
        ],
      };

    case 'army':
      // Dry march — single voice; Spark scales tempo/timbre externally.
      return {
        bpm: 100,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 55, steps: 2, type: 'square', gain: 0.055 },
              { kind: 'tone', midi: 55, steps: 2, type: 'square', gain: 0.04 },
              { kind: 'tone', midi: 55, steps: 2, type: 'square', gain: 0.055 },
              { kind: 'tone', midi: 58, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 55, steps: 2, type: 'square', gain: 0.055 },
              { kind: 'tone', midi: 55, steps: 2, type: 'square', gain: 0.04 },
              { kind: 'tone', midi: 53, steps: 2, type: 'square', gain: 0.05 },
              { kind: 'tone', midi: 55, steps: 2, type: 'square', gain: 0.052 },
            ],
          },
        ],
      };

    case 'rehab':
      // Распорядок — calm.
      return {
        bpm: 70,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 57, steps: 8, type: 'triangle', gain: 0.04 },
              { kind: 'tone', midi: 60, steps: 8, type: 'triangle', gain: 0.038 },
              { kind: 'tone', midi: 55, steps: 8, type: 'triangle', gain: 0.036 },
              { kind: 'tone', midi: 52, steps: 8, type: 'triangle', gain: 0.034 },
            ],
          },
        ],
      };

    case 'krug':
      // Sparse notes with long silence between.
      return {
        bpm: 60,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 62, steps: 2, type: 'triangle', gain: 0.035 },
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              { kind: 'tone', midi: 59, steps: 2, type: 'triangle', gain: 0.03 },
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
              R,
            ],
          },
        ],
      };

    case 'finale': {
      // Brightens by phase (0..3+): more high notes, higher bpm lean.
      const phase = Math.max(0, Math.min(3, Math.floor(finalePhase)));
      const bpm = 84 + phase * 10;
      const high = 72 + phase * 2;
      return {
        bpm,
        tracks: [
          {
            notes: [
              { kind: 'tone', midi: 60, steps: 4, type: 'triangle', gain: 0.045 + phase * 0.008 },
              { kind: 'tone', midi: 64, steps: 4, type: 'triangle', gain: 0.042 + phase * 0.008 },
              { kind: 'tone', midi: 67, steps: 4, type: 'triangle', gain: 0.044 + phase * 0.008 },
              { kind: 'tone', midi: 64, steps: 4, type: 'triangle', gain: 0.04 + phase * 0.008 },
            ],
          },
          {
            gain: 0.3 + phase * 0.15,
            notes: [
              R,
              R,
              { kind: 'tone', midi: high, steps: 2, type: 'square', gain: 0.03 + phase * 0.01 },
              R,
              R,
              R,
              { kind: 'tone', midi: high + 4, steps: 2, type: 'square', gain: 0.028 + phase * 0.01 },
              R,
            ],
          },
        ],
      };
    }
  }
}
