/**
 * AudioEngine — procedural Mega Drive–style soundtrack + SFX.
 * Unlocks only after a user gesture; degrades to no-op without AudioContext.
 */

import { Sequencer } from './sequencer';
import { playSfxTone, type SfxId } from './sfx';
import { loadSettings, saveSettings } from './settings';
import { createNoiseBuffer } from './synth';
import { SCENE_THEME, themePattern, type ThemeId } from './themes';

/** Default master gain — keep quiet under UI / dialogue. */
const DEFAULT_MASTER = 0.11;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private readonly noiseCache = { buf: null as AudioBuffer | null };
  private unlocked = false;
  private muted = false;
  private currentTheme: ThemeId | null = null;
  private armySpark = 0.62;
  private finalePhase = 0;
  private readonly sequencer: Sequencer;
  private gestureBound = false;
  private visibilityBound = false;

  constructor() {
    const settings = loadSettings();
    this.muted = settings.muted === true;

    this.sequencer = new Sequencer(
      () => this.ctx,
      () => this.master,
      () => this.noiseBuf,
      () => this.isAudible(),
    );
  }

  /** Wire gesture unlock + visibility suspend. Safe to call once from bootstrap. */
  install(): void {
    if (!this.gestureBound) {
      this.gestureBound = true;
      const unlock = (): void => {
        void this.unlock();
      };
      window.addEventListener('pointerdown', unlock, { once: true, capture: true });
      window.addEventListener('keydown', unlock, { once: true, capture: true });
      window.addEventListener('touchstart', unlock, { once: true, capture: true });
    }
    if (!this.visibilityBound) {
      this.visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.visibilityState === 'hidden') {
          this.sequencer.stop();
          void this.ctx.suspend().catch(() => undefined);
        } else if (!this.muted && this.unlocked && this.currentTheme) {
          void this.ctx.resume().catch(() => undefined);
          this.sequencer.start();
        }
      });
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get themeId(): ThemeId | null {
    return this.currentTheme;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveSettings({ muted });
    this.applyMuteGain();
    if (muted) {
      this.sequencer.stop();
    } else if (this.unlocked && this.currentTheme && document.visibilityState !== 'hidden') {
      this.sequencer.start();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Play / switch looping theme. Idempotent for same id. */
  playTheme(id: ThemeId | string): void {
    const theme = (SCENE_THEME[id] ?? id) as ThemeId;
    if (!isThemeId(theme)) return;
    if (this.currentTheme === theme && this.sequencer) {
      // Refresh army/finale params even if same theme
      this.applyThemeParams(theme);
      return;
    }
    this.currentTheme = theme;
    this.applyThemeParams(theme);
    this.sequencer.setPattern(themePattern(theme, this.finalePhase));
    if (this.unlocked && this.isAudible() && document.visibilityState !== 'hidden') {
      this.sequencer.start();
    }
  }

  stopTheme(): void {
    this.currentTheme = null;
    this.sequencer.stop();
    this.sequencer.setPattern(null);
  }

  playSfx(id: SfxId): void {
    if (!this.isAudible()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    void this.resumeIfNeeded();
    try {
      playSfxTone(ctx, this.master, id, this.noiseCache);
    } catch {
      // Synthesis failure must not break gameplay
    }
  }

  /**
   * Army «Искра» / Spark 0..1 — dry march tempo + timbre.
   * Higher spark → slightly quicker / brighter square.
   */
  setArmySpark(value: number): void {
    this.armySpark = Math.max(0, Math.min(1, value));
    if (this.currentTheme === 'army') this.applyThemeParams('army');
  }

  /** Finale narrative phase index — pattern brightens as phase rises. */
  setFinalePhase(phase: number): void {
    const next = Math.max(0, Math.floor(phase));
    if (next === this.finalePhase) return;
    this.finalePhase = next;
    if (this.currentTheme === 'finale') {
      this.sequencer.setPattern(themePattern('finale', this.finalePhase));
      this.applyThemeParams('finale');
    }
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return;
    const ctx = this.ensureContext();
    if (!ctx) {
      // No AudioContext — game continues silently
      this.unlocked = true;
      return;
    }
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      this.unlocked = true;
      if (this.currentTheme && this.isAudible() && document.visibilityState !== 'hidden') {
        this.sequencer.start();
      }
    } catch {
      this.unlocked = true;
    }
  }

  private isAudible(): boolean {
    return !this.muted && this.unlocked;
  }

  private applyMuteGain(): void {
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.muted ? 0.0001 : DEFAULT_MASTER, now);
  }

  private applyThemeParams(theme: ThemeId): void {
    if (theme === 'army') {
      // Spark low → slower, duller; high → brisker, brighter
      this.sequencer.setBpmScale(0.82 + this.armySpark * 0.45);
      this.sequencer.setTimbreBright(this.armySpark);
    } else if (theme === 'finale') {
      this.sequencer.setBpmScale(1 + this.finalePhase * 0.06);
      this.sequencer.setTimbreBright(Math.min(1, this.finalePhase / 3));
    } else {
      this.sequencer.setBpmScale(1);
      this.sequencer.setTimbreBright(0.45);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0.0001 : DEFAULT_MASTER;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = createNoiseBuffer(this.ctx, 1);
      this.noiseCache.buf = this.noiseBuf;
      return this.ctx;
    } catch {
      this.ctx = null;
      this.master = null;
      return null;
    }
  }

  private async resumeIfNeeded(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // ignore
      }
    }
  }
}

const THEME_IDS: readonly ThemeId[] = [
  'apartment',
  'market',
  'stairwell',
  'station',
  'garages',
  'yard',
  'bridge',
  'disco',
  'detinets',
  'army',
  'rehab',
  'krug',
  'finale',
];

function isThemeId(id: string): id is ThemeId {
  return (THEME_IDS as readonly string[]).includes(id);
}

/** Process-wide singleton used by scenes / systems. */
export const audio = new AudioEngine();
