// Web Audio API Synthesizer for high-performance zero-asset game sound effects and background music

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const soundManager = {
  isEnabled: () => soundEnabled,
  toggle: () => {
    soundEnabled = !soundEnabled;
    return soundEnabled;
  },
  setSound: (enabled: boolean) => {
    soundEnabled = enabled;
  },

  playClick: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },

  playDiceRoll: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const time = now + i * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + Math.random() * 300, time);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.035);
    }
  },

  playMove: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },

  playCapture: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.2);
  },

  playCardSlide: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  },

  playStrikerHit: (power = 1) => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const clampedPower = Math.min(Math.max(power, 0.2), 1.5);
    osc.frequency.setValueAtTime(400 + clampedPower * 180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.3 * Math.min(clampedPower, 1), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  },

  playPocket: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.15);
  },

  playNightBell: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(329.63, now);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 1.2);
  },

  playTick: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  },

  playFanfare: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  },

  playApplause: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Celebratory victory chords
    const triumphNotes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    triumphNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.18, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.5);
    });

    // Realistic multi-stage clapping and cheering applause (35 claps over 2.6s)
    const numClaps = 36;
    for (let i = 0; i < numClaps; i++) {
      const clapTime = now + 0.18 + (i / numClaps) * 2.3 + (Math.random() * 0.06 - 0.03);
      const bufferSize = Math.floor(ctx.sampleRate * 0.045);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.22));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 600, clapTime);
      filter.Q.setValueAtTime(2.2, clapTime);

      const gain = ctx.createGain();
      const volume = 0.12 + Math.random() * 0.15;
      gain.gain.setValueAtTime(volume, clapTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(clapTime);
    }
  },

  playBuzzer: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(120, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.35);
  },

  playDrumRoll: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 20; i++) {
      const t = now + i * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120 + Math.random() * 40, t);
      gain.gain.setValueAtTime(0.08 + (i / 20) * 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.045);
    }
  },

  playLaugh: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitches = [300, 380, 320, 420, 360, 460, 340];
    pitches.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.09);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  },

  playJoinRoom: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Pleasant two-tone chime (G4 -> C5)
    [392.0, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  },

  playTurnNotification: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Friendly reminder chime (E5 -> A5)
    [659.25, 880.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.22, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.25);
    });
  },

  playChatPop: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  },
};

// ==========================================
// Web Audio Procedural Background Music
// ==========================================

export type MusicTrackId = 'majlis' | 'challenge' | 'tarab';

export interface MusicTrackInfo {
  id: MusicTrackId;
  name: string;
  description: string;
  tempo: number; // BPM
}

export const MUSIC_TRACKS: MusicTrackInfo[] = [
  {
    id: 'majlis',
    name: 'جلسة هادئة 🌙',
    description: 'أنغام عود ومقام ريست هادئ يناسب السوالف واللعب المريح',
    tempo: 96,
  },
  {
    id: 'challenge',
    name: 'حماس وتحدي ⚡',
    description: 'إيقاع شرقي حيوي سريع يحمس المنافسة وشد الأعصاب',
    tempo: 120,
  },
  {
    id: 'tarab',
    name: 'طرب وليالي 🎶',
    description: 'تقاسيم ونغمات شرقية دافئة لأجواء الجلسات والسمر',
    tempo: 84,
  },
];

class MusicManager {
  private isPlaying = false;
  private currentTrack: MusicTrackId = 'majlis';
  private volume = 0.35;
  private timer: number | null = null;
  private step = 0;
  private masterGain: GainNode | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMuted = localStorage.getItem('jumah_music_muted');
        const savedTrack = localStorage.getItem('jumah_music_track') as MusicTrackId;
        const savedVol = localStorage.getItem('jumah_music_volume');
        if (savedTrack && ['majlis', 'challenge', 'tarab'].includes(savedTrack)) {
          this.currentTrack = savedTrack;
        }
        if (savedVol) {
          this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
        }
        if (savedMuted === 'false') {
          // Keep paused until first user action to comply with browser autoplay policy
        }
      } catch {
        // ignore
      }
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      volume: this.volume,
    };
  }

  public toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play() {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;

    // Create or reconnect master gain
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);

    this.startLoop();
    this.notify();

    try {
      localStorage.setItem('jumah_music_muted', 'false');
    } catch {
      // ignore
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.masterGain && audioCtx) {
      this.masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    this.notify();

    try {
      localStorage.setItem('jumah_music_muted', 'true');
    } catch {
      // ignore
    }
  }

  public setTrack(trackId: MusicTrackId) {
    if (this.currentTrack === trackId) return;
    this.currentTrack = trackId;
    this.step = 0;
    if (this.isPlaying) {
      this.startLoop();
    }
    this.notify();

    try {
      localStorage.setItem('jumah_music_track', trackId);
    } catch {
      // ignore
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && audioCtx && this.isPlaying) {
      this.masterGain.gain.setValueAtTime(this.volume, audioCtx.currentTime);
    }
    this.notify();

    try {
      localStorage.setItem('jumah_music_volume', this.volume.toString());
    } catch {
      // ignore
    }
  }

  private startLoop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const currentTrackInfo = MUSIC_TRACKS.find((t) => t.id === this.currentTrack) || MUSIC_TRACKS[0];
    const beatIntervalMs = (60 / currentTrackInfo.tempo / 2) * 1000; // 8th notes

    this.timer = window.setInterval(() => {
      this.playBeatStep();
      this.step = (this.step + 1) % 32;
    }, beatIntervalMs);
  }

  private playBeatStep() {
    const ctx = getAudioContext();
    if (!ctx || !this.isPlaying || !this.masterGain) return;
    const now = ctx.currentTime;

    // Musical scales based on tracks (in Hz):
    // Bayati / Hijaz / Rast flavored pentatonic scales
    const majlisNotes = [
      220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 523.25,
    ]; // A minor / Rast
    const challengeNotes = [
      146.83, 164.81, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0,
    ]; // D minor Hijaz
    const tarabNotes = [
      196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33,
    ]; // G Rast

    const s = this.step;

    if (this.currentTrack === 'majlis') {
      // 1. Warm bass drone / root note on every bar start (step 0 and 16)
      if (s === 0 || s === 16) {
        this.synthBass(ctx, now, s === 0 ? 110.0 : 146.83, 1.8);
      }

      // 2. Soft rhythmic pulse / darbuka tick on 0, 4, 8, 12, 16, 20, 24, 28
      if (s % 4 === 0) {
        this.synthPercussion(ctx, now, s % 8 === 0 ? 'dum' : 'tak');
      }

      // 3. Gentle plucking melody (oud/kanun feel)
      const melodySequence = [0, -1, 2, -1, 4, 3, -1, 2, 0, -1, 3, 5, 4, -1, 2, 0];
      const noteIdx = melodySequence[s % 16];
      if (noteIdx !== -1) {
        const freq = majlisNotes[noteIdx % majlisNotes.length];
        this.synthPluck(ctx, now, freq, 0.45);
      }
    } else if (this.currentTrack === 'challenge') {
      // Fast, exciting beat
      // Bassline on 0, 3, 6, 8, 10, 12, 14
      if ([0, 6, 8, 12, 16, 22, 24, 28].includes(s)) {
        const bassFreq = s < 16 ? 146.83 : 174.61;
        this.synthBass(ctx, now, bassFreq, 0.35);
      }

      // Punchy percussion
      if (s % 2 === 0) {
        this.synthPercussion(ctx, now, s % 8 === 0 ? 'dum' : 'tak');
      } else if (s % 4 === 3) {
        this.synthPercussion(ctx, now, 'shaker');
      }

      // Lively arpeggio
      const arpPatterns = [0, 2, 4, 6, 4, 2, 3, 5, 0, 2, 4, 7, 6, 4, 2, 0];
      const pIdx = arpPatterns[s % 16];
      const freq = challengeNotes[pIdx % challengeNotes.length];
      this.synthPluck(ctx, now, freq, 0.25, 'sawtooth');
    } else if (this.currentTrack === 'tarab') {
      // Warm, meditative Tarab drone
      if (s === 0) {
        this.synthBass(ctx, now, 98.0, 3.2); // Low G
      }
      if (s === 16) {
        this.synthBass(ctx, now, 130.81, 2.8); // C
      }

      if (s % 8 === 0) {
        this.synthPercussion(ctx, now, 'dum');
      } else if (s % 4 === 2) {
        this.synthPercussion(ctx, now, 'tak');
      }

      // Expressive slow melody
      const tarabSeq = [4, -1, 3, -1, 5, -1, 4, -1, 2, -1, 1, -1, 0, -1, 2, 0];
      const tIdx = tarabSeq[s % 16];
      if (tIdx !== -1) {
        const freq = tarabNotes[tIdx % tarabNotes.length];
        this.synthPluck(ctx, now, freq, 0.65, 'triangle');
      }
    }
  }

  // Oud / Pluck synthesis with organic decay
  private synthPluck(
    ctx: AudioContext,
    time: number,
    freq: number,
    duration = 0.5,
    type: OscillatorType = 'triangle'
  ) {
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Low pad / bass foundation
  private synthBass(ctx: AudioContext, time: number, freq: number, duration = 1.0) {
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Percussive oriental beats (dum, tak, shaker)
  private synthPercussion(ctx: AudioContext, time: number, type: 'dum' | 'tak' | 'shaker') {
    if (!this.masterGain) return;

    if (type === 'dum') {
      // Deep bass drum / tabla center hit
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.18);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.18);
    } else if (type === 'tak') {
      // Crisp rim / darbuka rim snap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, time);
      osc.frequency.exponentialRampToValueAtTime(180, time + 0.06);
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.06);
    } else if (type === 'shaker') {
      // Soft high shaker pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200 + Math.random() * 400, time);
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.04);
    }
  }
}

export const musicManager = new MusicManager();
