/**
 * Low-level Web Audio helpers — oscillators, noise, envelopes.
 * All original procedural tones; no sample files.
 */

export type WaveKind = 'square' | 'triangle' | 'sawtooth' | 'sine';

export function createNoiseBuffer(ctx: AudioContext, seconds = 1): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playTone(
  ctx: AudioContext,
  dest: AudioNode,
  opts: {
    freq: number;
    duration: number;
    type?: WaveKind;
    gain?: number;
    attack?: number;
    release?: number;
    when?: number;
  },
): void {
  const when = opts.when ?? ctx.currentTime;
  const type = opts.type ?? 'square';
  const peak = opts.gain ?? 0.08;
  const attack = opts.attack ?? 0.01;
  const release = opts.release ?? 0.06;
  const dur = Math.max(0.02, opts.duration);

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(opts.freq, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + attack);
  g.gain.exponentialRampToValueAtTime(
    0.0001,
    when + Math.max(attack + 0.01, dur - release),
  );
  osc.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

export function playNoiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  opts: {
    duration: number;
    gain?: number;
    when?: number;
    filterFreq?: number;
  },
): void {
  const when = opts.when ?? ctx.currentTime;
  const peak = opts.gain ?? 0.05;
  const dur = Math.max(0.02, opts.duration);

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = opts.filterFreq ?? 1800;
  filter.Q.value = 1.2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(when);
  src.stop(when + dur + 0.02);
}
