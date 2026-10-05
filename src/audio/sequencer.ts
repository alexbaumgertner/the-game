/**
 * Tiny step sequencer for looping chiptune-style patterns.
 */

import { playNoiseBurst, playTone, type WaveKind } from './synth';

export type Note =
  | {
      kind: 'tone';
      /** MIDI-ish pitch; 0 = rest */
      midi: number;
      steps?: number;
      type?: WaveKind;
      gain?: number;
    }
  | {
      kind: 'noise';
      steps?: number;
      gain?: number;
      filterFreq?: number;
    }
  | { kind: 'rest'; steps?: number };

export interface PatternTrack {
  notes: Note[];
  /** Gain multiplier for this track. */
  gain?: number;
}

export interface Pattern {
  /** Steps per beat (default 4 = 16th notes at bpm). */
  stepsPerBeat?: number;
  bpm: number;
  tracks: PatternTrack[];
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Sequencer {
  private timer: number | null = null;
  private step = 0;
  private pattern: Pattern | null = null;
  private bpmScale = 1;
  private timbreBright = 0;
  private running = false;

  constructor(
    private readonly getCtx: () => AudioContext | null,
    private readonly getDest: () => AudioNode | null,
    private readonly getNoise: () => AudioBuffer | null,
    private readonly isAudible: () => boolean,
  ) {}

  setPattern(pattern: Pattern | null): void {
    this.pattern = pattern;
    this.step = 0;
  }

  /** 1 = normal; army Spark / finale can push this. */
  setBpmScale(scale: number): void {
    this.bpmScale = Math.max(0.5, Math.min(1.8, scale));
  }

  /** 0..1 — brightens oscillator mix (square ↔ triangle lean). */
  setTimbreBright(amount: number): void {
    this.timbreBright = Math.max(0, Math.min(1, amount));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext(0);
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(delayMs: number): void {
    if (!this.running) return;
    this.timer = window.setTimeout(() => this.tick(), Math.max(0, delayMs));
  }

  private tick(): void {
    if (!this.running || !this.pattern) return;

    const ctx = this.getCtx();
    const dest = this.getDest();
    const pattern = this.pattern;
    const spb = pattern.stepsPerBeat ?? 4;
    const bpm = pattern.bpm * this.bpmScale;
    const stepSec = 60 / bpm / spb;

    if (ctx && dest && this.isAudible()) {
      this.playStep(ctx, dest, pattern, this.step);
    }

    this.step += 1;
    // Loop length = max track length in steps
    let loopLen = 1;
    for (const track of pattern.tracks) {
      let len = 0;
      for (const n of track.notes) len += n.steps ?? 1;
      loopLen = Math.max(loopLen, len);
    }
    if (this.step >= loopLen) this.step = 0;

    this.scheduleNext(stepSec * 1000);
  }

  private playStep(
    ctx: AudioContext,
    dest: AudioNode,
    pattern: Pattern,
    globalStep: number,
  ): void {
    const noise = this.getNoise();
    const bright = this.timbreBright;

    for (const track of pattern.tracks) {
      let cursor = 0;
      for (const note of track.notes) {
        const span = note.steps ?? 1;
        if (globalStep >= cursor && globalStep < cursor + span) {
          // Only trigger on the first step of a multi-step note
          if (globalStep === cursor) {
            const trackGain = track.gain ?? 1;
            if (note.kind === 'tone' && note.midi > 0) {
              const baseType = note.type ?? 'square';
              const type: WaveKind =
                bright > 0.55 && baseType === 'triangle'
                  ? 'square'
                  : bright < 0.35 && baseType === 'square'
                    ? 'triangle'
                    : baseType;
              const spb = pattern.stepsPerBeat ?? 4;
              const bpm = pattern.bpm * this.bpmScale;
              const stepSec = 60 / bpm / spb;
              playTone(ctx, dest, {
                freq: midiToHz(note.midi),
                duration: stepSec * span * 0.92,
                type,
                gain: (note.gain ?? 0.06) * trackGain * (0.85 + bright * 0.35),
              });
            } else if (note.kind === 'noise' && noise) {
              const spb = pattern.stepsPerBeat ?? 4;
              const bpm = pattern.bpm * this.bpmScale;
              const stepSec = 60 / bpm / spb;
              playNoiseBurst(ctx, dest, noise, {
                duration: stepSec * span * 0.7,
                gain: (note.gain ?? 0.03) * trackGain,
                filterFreq: note.filterFreq ?? 2000,
              });
            }
          }
          break;
        }
        cursor += span;
      }
    }
  }
}
