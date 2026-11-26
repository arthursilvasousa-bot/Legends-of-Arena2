import {
  DEFAULT_SETTINGS,
  GameSettings,
  computeEffectiveMusicGain,
  computeEffectiveSfxGain,
  loadSettings,
} from './settings';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private muted = false;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmPlaying = false;
  private bgmIntensity: 'menu' | 'fight' = 'menu';

  constructor() {
    if (typeof window !== 'undefined') {
      this.settings = loadSettings();
    }
  }

  private getSfxScale(): number {
    return computeEffectiveSfxGain(this.settings, this.muted);
  }

  private getMusicScale(): number {
    return computeEffectiveMusicGain(this.settings, this.muted);
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || !this.unlocked || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.unlocked = true;
    this.ensureContext();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    if (m) {
      this.stopBgmTimerOnly();
    } else {
      this.ensureContext();
      if (this.bgmPlaying && this.settings.musicEnabled) {
        this.startBgm(this.bgmIntensity);
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public applySettings(next: GameSettings): void {
    this.settings = { ...next };
    if (!next.musicEnabled || this.muted) {
      this.stopBgmTimerOnly();
    } else if (this.bgmPlaying && this.bgmTimer === null) {
      this.startBgm(this.bgmIntensity);
    }
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
    channel: 'sfx' | 'music' = 'sfx'
  ): void {
    const scale = channel === 'music' ? this.getMusicScale() : this.getSfxScale();
    const scaledVol = volume * scale;
    if (scaledVol <= 0.0005) return;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(scaledVol, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(
    duration: number,
    volume: number,
    highpass = 300,
    channel: 'sfx' | 'music' = 'sfx'
  ): void {
    const scale = channel === 'music' ? this.getMusicScale() : this.getSfxScale();
    const scaledVol = volume * scale;
    if (scaledVol <= 0.0005) return;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(scaledVol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  public playUiSelect(): void {
    this.tone(440, 587, 0.065, 'square', 0.06);
  }

  public playUiConfirm(): void {
    this.tone(392, 523, 0.08, 'triangle', 0.09);
    this.tone(523, 784, 0.14, 'square', 0.07, 0.06);
  }

  public playUiBack(): void {
    this.tone(440, 293.66, 0.09, 'triangle', 0.08);
    this.tone(293.66, 220, 0.12, 'square', 0.05, 0.05);
  }

  public playPanelOpen(): void {
    this.tone(293.66, 440, 0.11, 'triangle', 0.08);
    this.tone(440, 659.25, 0.14, 'sine', 0.06, 0.05);
  }

  public playHitLight(): void {
    const pitch = 0.92 + Math.random() * 0.16;
    this.tone(210 * pitch, 75, 0.09, 'sawtooth', 0.12);
    this.noise(0.07, 0.11, 500);
  }

  public playHitHeavy(): void {
    const pitch = 0.92 + Math.random() * 0.16;
    this.tone(150 * pitch, 42, 0.18, 'sawtooth', 0.18);
    this.tone(95 * pitch, 35, 0.22, 'square', 0.12);
    this.noise(0.14, 0.18, 220);
  }

  public playBlock(): void {
    this.tone(680, 420, 0.08, 'square', 0.09);
    this.noise(0.05, 0.07, 1400);
  }

  public playGrab(): void {
    this.tone(180, 65, 0.24, 'triangle', 0.16);
    this.noise(0.16, 0.15, 250);
  }

  public playJump(): void {
    this.tone(190, 390, 0.1, 'triangle', 0.07);
  }

  public playLand(): void {
    this.tone(110, 55, 0.07, 'sine', 0.08);
  }

  public playSpecial(): void {
    this.tone(280, 620, 0.16, 'sawtooth', 0.09);
    this.tone(420, 210, 0.2, 'triangle', 0.08, 0.05);
  }

  public playTeleport(): void {
    this.tone(720, 180, 0.16, 'sine', 0.1);
    this.noise(0.12, 0.08, 900);
  }

  public playRoundStart(): void {
    this.tone(330, 330, 0.12, 'square', 0.08);
    this.tone(440, 440, 0.12, 'square', 0.08, 0.12);
    this.tone(659, 659, 0.24, 'sawtooth', 0.1, 0.24);
  }

  public playKo(): void {
    this.tone(240, 45, 0.45, 'sawtooth', 0.2);
    this.tone(120, 36, 0.5, 'square', 0.15, 0.05);
    this.noise(0.32, 0.2, 180);
  }

  public playVictory(): void {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, i) => {
      this.tone(n, n, 0.18, 'square', 0.09, i * 0.11);
      this.tone(n * 0.5, n * 0.5, 0.2, 'triangle', 0.08, i * 0.11);
    });
  }

  private stopBgmTimerOnly(): void {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public startBgm(intensity: 'menu' | 'fight'): void {
    this.bgmIntensity = intensity;
    this.bgmPlaying = true;
    if (this.muted || !this.settings.musicEnabled || typeof window === 'undefined') return;
    this.stopBgmTimerOnly();

    // Dark medieval fantasy D-minor / Phrygian arcade progression
    const menuMelody = [
      293.66, 0, 349.23, 329.63,
      293.66, 0, 440, 415.3,
      392, 0, 349.23, 329.63,
      293.66, 261.63, 277.18, 220,
    ];
    const menuChoirPad = [146.83, 146.83, 174.61, 164.81, 130.81, 130.81, 116.54, 110];
    const fightMelody = [
      293.66, 293.66, 349.23, 440,
      415.3, 349.23, 329.63, 293.66,
      261.63, 293.66, 349.23, 466.16,
      440, 392, 349.23, 329.63,
    ];
    const bassLine = [146.83, 146.83, 146.83, 174.61, 130.81, 130.81, 116.54, 110];

    const stepMs = intensity === 'fight' ? 155 : 235;
    this.bgmTimer = window.setInterval(() => {
      if (this.muted || !this.bgmPlaying || !this.settings.musicEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;

      const idx = this.bgmStep % 16;
      const bassIdx = this.bgmStep % 8;
      const melody = this.bgmIntensity === 'fight' ? fightMelody : menuMelody;
      const note = melody[idx];
      const bass = bassLine[bassIdx];

      if (note > 0) {
        this.tone(
          note,
          note * 0.995,
          (stepMs / 1000) * 0.85,
          this.bgmIntensity === 'fight' ? 'sawtooth' : 'triangle',
          this.bgmIntensity === 'fight' ? 0.032 : 0.03,
          0,
          'music'
        );
      }

      if (this.bgmIntensity === 'menu' && idx % 4 === 0) {
        const pad = menuChoirPad[Math.floor(idx / 2) % menuChoirPad.length];
        this.tone(pad * 2, pad * 2, (stepMs / 1000) * 3.6, 'sine', 0.018, 0, 'music');
        this.tone(pad * 3, pad * 3, (stepMs / 1000) * 3.4, 'triangle', 0.01, 0, 'music');
      }

      if (this.bgmStep % 2 === 0) {
        this.tone(bass, bass, (stepMs / 1000) * 1.35, 'triangle', 0.045, 0, 'music');
      }

      if (this.bgmIntensity === 'fight') {
        if (idx % 4 === 0) {
          this.tone(95, 42, 0.08, 'sine', 0.06, 0, 'music');
        } else if (idx % 4 === 2) {
          this.noise(0.04, 0.03, 1800, 'music');
        }
      } else if (idx % 8 === 0) {
        // Subtle cinematic timpani heartbeat in menu
        this.tone(82, 46, 0.14, 'sine', 0.04, 0, 'music');
      }
      this.bgmStep += 1;
    }, stepMs);
  }

  public stopBgm(): void {
    this.bgmPlaying = false;
    this.stopBgmTimerOnly();
  }
}

export const soundEngine = new SoundEngine();
