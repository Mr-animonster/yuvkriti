export type WeddingSoundEffect = "jump" | "collect" | "stumble" | "milestone" | "finale";

export class WeddingAudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private backgroundAudio: HTMLAudioElement | null = null;
  private instrumentalTimer: number | null = null;
  private volume = 0.58;
  private muted = false;
  private noteIndex = 0;

  async unlock(backgroundMusicUrl: string | null) {
    if (this.context) {
      await this.context.resume();
      return;
    }

    const context = new window.AudioContext();
    const master = context.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    master.connect(context.destination);
    this.context = context;
    this.masterGain = master;
    await context.resume();

    if (backgroundMusicUrl) {
      const music = new Audio(backgroundMusicUrl);
      music.loop = true;
      music.preload = "auto";
      music.volume = this.muted ? 0 : this.volume;
      this.backgroundAudio = music;
      try {
        await music.play();
      } catch {
        this.backgroundAudio = null;
        this.startInstrumental();
      }
    } else {
      this.startInstrumental();
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyVolume();
  }

  play(effect: WeddingSoundEffect) {
    const context = this.context;
    const output = this.masterGain;
    if (!context || !output || this.muted) return;

    const patterns: Record<WeddingSoundEffect, number[]> = {
      jump: [392, 587],
      collect: [659, 880],
      stumble: [220, 174],
      milestone: [523, 659, 784],
      finale: [523, 659, 784, 1_046],
    };
    const notes = patterns[effect];
    const noteGap = effect === "finale" ? 0.12 : 0.1;
    const now = context.currentTime;

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const start = now + index * noteGap;
      const duration = effect === "stumble" ? 0.18 : 0.22;
      oscillator.type = effect === "stumble" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(effect === "finale" ? 0.18 : 0.1, start + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(output);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  }

  dispose() {
    if (this.instrumentalTimer !== null) window.clearInterval(this.instrumentalTimer);
    this.instrumentalTimer = null;
    this.backgroundAudio?.pause();
    this.backgroundAudio = null;
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    if (context && context.state !== "closed") void context.close();
  }

  private applyVolume() {
    const gain = this.masterGain;
    if (gain && this.context) {
      gain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.04);
    }
    if (this.backgroundAudio) this.backgroundAudio.volume = this.muted ? 0 : this.volume;
  }

  private startInstrumental() {
    const context = this.context;
    const output = this.masterGain;
    if (!context || !output) return;

    const drone = context.createOscillator();
    const droneGain = context.createGain();
    drone.type = "sine";
    drone.frequency.value = 196;
    droneGain.gain.value = 0.035;
    drone.connect(droneGain);
    droneGain.connect(output);
    drone.start();

    const scale = [392, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 440];
    const playNextNote = () => {
      const activeContext = this.context;
      const activeOutput = this.masterGain;
      if (!activeContext || !activeOutput || this.muted) return;
      const oscillator = activeContext.createOscillator();
      const envelope = activeContext.createGain();
      const frequency = scale[this.noteIndex % scale.length] ?? 523.25;
      this.noteIndex += 1;
      const now = activeContext.currentTime;
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(0.075, now + 0.04);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      oscillator.connect(envelope);
      envelope.connect(activeOutput);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    };

    playNextNote();
    this.instrumentalTimer = window.setInterval(playNextNote, 560);
  }
}