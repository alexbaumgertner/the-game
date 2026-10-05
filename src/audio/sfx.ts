/**
 * One-shot SFX — footsteps, dialog blip, quiz, journal, kettle/mug.
 */

import { createNoiseBuffer, playNoiseBurst, playTone } from './synth';

export type SfxId = 'footstep' | 'dialog' | 'quiz_answer' | 'journal' | 'kettle' | 'mug';

export function playSfxTone(
  ctx: AudioContext,
  dest: AudioNode,
  id: SfxId,
  noiseCache: { buf: AudioBuffer | null },
): void {
  if (!noiseCache.buf) {
    noiseCache.buf = createNoiseBuffer(ctx, 0.5);
  }
  const noise = noiseCache.buf;

  switch (id) {
    case 'footstep':
      playNoiseBurst(ctx, dest, noise, {
        duration: 0.045,
        gain: 0.028,
        filterFreq: 420,
      });
      break;
    case 'dialog':
      playTone(ctx, dest, {
        freq: 680,
        duration: 0.04,
        type: 'square',
        gain: 0.035,
        attack: 0.005,
        release: 0.03,
      });
      break;
    case 'quiz_answer':
      playTone(ctx, dest, {
        freq: 520,
        duration: 0.06,
        type: 'square',
        gain: 0.04,
      });
      playTone(ctx, dest, {
        freq: 780,
        duration: 0.08,
        type: 'triangle',
        gain: 0.035,
        when: ctx.currentTime + 0.05,
      });
      break;
    case 'journal':
      playTone(ctx, dest, {
        freq: 340,
        duration: 0.09,
        type: 'triangle',
        gain: 0.04,
      });
      playTone(ctx, dest, {
        freq: 410,
        duration: 0.07,
        type: 'triangle',
        gain: 0.03,
        when: ctx.currentTime + 0.06,
      });
      break;
    case 'kettle':
      playTone(ctx, dest, {
        freq: 880,
        duration: 0.18,
        type: 'square',
        gain: 0.03,
        attack: 0.04,
        release: 0.08,
      });
      break;
    case 'mug':
      playTone(ctx, dest, {
        freq: 240,
        duration: 0.08,
        type: 'triangle',
        gain: 0.045,
      });
      playNoiseBurst(ctx, dest, noise, {
        duration: 0.05,
        gain: 0.02,
        filterFreq: 800,
        when: ctx.currentTime + 0.02,
      });
      break;
  }
}
