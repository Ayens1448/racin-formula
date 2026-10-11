/**
 * Web Audio Engine for Apex GP
 * Synthesizes realistic F1 V6 turbo hybrid sound, tire squeal, start beeps, and UI effects.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  // Tire squeal nodes
  private squealSource: AudioBufferSourceNode | null = null;
  private squealGain: GainNode | null = null;
  private squealFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Wind rush nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Kerb rumble nodes
  private kerbGain: GainNode | null = null;
  private kerbOsc: OscillatorNode | null = null;
  private isKerbRumbling: boolean = false;

  private isRunning: boolean = false;

  constructor() {
    const saved = localStorage.getItem('apex_sound_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private makeDistortionCurve(amount: number = 20): Float32Array {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('apex_sound_muted', String(this.isMuted));
    if (this.isMuted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startEngine() {
    if (this.isRunning) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.distortionNode = this.ctx.createWaveShaper();
      this.distortionNode.curve = this.makeDistortionCurve(15) as Float32Array<ArrayBuffer>;
      this.distortionNode.oversample = '2x';

      // Primary cylinder oscillation (V6 high-rev tone)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(80, this.ctx.currentTime);

      // Secondary harmonic
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(120, this.ctx.currentTime);

      // Low rumble sub-bass
      this.engineSub = this.ctx.createOscillator();
      this.engineSub.type = 'sawtooth';
      this.engineSub.frequency.setValueAtTime(40, this.ctx.currentTime);

      this.engineOsc1.connect(this.distortionNode);
      this.engineOsc2.connect(this.distortionNode);
      this.engineSub.connect(this.distortionNode);

      this.distortionNode.connect(this.filterNode);
      this.filterNode.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineSub.start();

      // Setup continuous tire squeal node
      if (this.noiseBuffer) {
        this.squealGain = this.ctx.createGain();
        this.squealGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.squealFilter = this.ctx.createBiquadFilter();
        this.squealFilter.type = 'bandpass';
        this.squealFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        this.squealFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

        this.squealGain.connect(this.ctx.destination);
      }

      this.isRunning = true;
    } catch {
      // Audio autoplay policy handled safely
    }
  }

  public updateEngineSound(rpmRatio: number, throttle: number, speedKmH: number) {
    if (!this.isRunning || !this.ctx || this.isMuted) return;

    const baseFreq = 70 + rpmRatio * 280; // 70Hz at idle to 350Hz at rev limit
    const now = this.ctx.currentTime;

    if (this.engineOsc1 && this.engineOsc2 && this.engineSub) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);
      this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    }

    if (this.filterNode) {
      const cutoff = 800 + rpmRatio * 2400 + throttle * 1200;
      this.filterNode.frequency.setTargetAtTime(cutoff, now, 0.05);
    }

    if (this.engineGain) {
      const vol = 0.04 + throttle * 0.12 + Math.min(speedKmH / 350, 1) * 0.04;
      this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : vol, now, 0.05);
    }
  }

  public playTireSqueal(intensity: number) {
    if (!this.ctx || this.isMuted || intensity <= 0.05) return;
    try {
      if (!this.squealSource && this.noiseBuffer) {
        this.squealSource = this.ctx.createBufferSource();
        this.squealSource.buffer = this.noiseBuffer;
        this.squealSource.loop = true;
        if (this.squealFilter && this.squealGain) {
          this.squealSource.connect(this.squealFilter);
          this.squealFilter.connect(this.squealGain);
          this.squealSource.start();
        }
      }
      if (this.squealGain) {
        const vol = Math.min(intensity * 0.09, 0.12);
        this.squealGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.03);
      }
    } catch {
      // Silently ignore audio glitch
    }
  }

  public stopTireSqueal() {
    if (this.squealGain && this.ctx) {
      this.squealGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public updateWindSound(speedKmH: number) {
    if (!this.ctx || this.isMuted) return;
    try {
      if (!this.windSource && this.noiseBuffer) {
        this.windSource = this.ctx.createBufferSource();
        this.windSource.buffer = this.noiseBuffer;
        this.windSource.loop = true;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

        this.windSource.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.ctx.destination);
        this.windSource.start();
      }

      if (this.windGain && this.windFilter) {
        // Starts earlier and builds to a powerful aerodynamic roar at 300+ km/h
        const factor = Math.max(speedKmH - 120, 0) / 220;
        const vol = Math.min(factor * 0.16, 0.22);
        this.windGain.gain.setTargetAtTime(this.isMuted ? 0 : vol, this.ctx.currentTime, 0.05);
        this.windFilter.frequency.setTargetAtTime(450 + factor * 1400, this.ctx.currentTime, 0.05);
      }
    } catch {
      // ignore
    }
  }

  public playKerbRumble() {
    if (!this.ctx || this.isMuted || this.isKerbRumbling) return;
    try {
      this.kerbOsc = this.ctx.createOscillator();
      this.kerbGain = this.ctx.createGain();

      this.kerbOsc.type = 'sawtooth';
      this.kerbOsc.frequency.setValueAtTime(48, this.ctx.currentTime);

      this.kerbGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.kerbOsc.connect(this.kerbGain);
      this.kerbGain.connect(this.ctx.destination);

      this.kerbOsc.start();
      this.isKerbRumbling = true;
    } catch {
      // ignore
    }
  }

  public stopKerbRumble() {
    if (this.isKerbRumbling && this.kerbOsc && this.ctx) {
      try {
        this.kerbGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
        setTimeout(() => {
          try {
            this.kerbOsc?.stop();
            this.kerbOsc = null;
          } catch {
            // ignore
          }
        }, 50);
      } catch {
        // ignore
      }
      this.isKerbRumbling = false;
    }
  }

  public playGearShift() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Exhaust pop / ignition cut
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'square';
      popOsc.frequency.setValueAtTime(140, now);
      popOsc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

      popGain.gain.setValueAtTime(0.15, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      popOsc.connect(popGain);
      popGain.connect(this.ctx.destination);
      popOsc.start(now);
      popOsc.stop(now + 0.1);
    } catch {
      // ignore
    }
  }

  public playStartBeep(isGo: boolean = false) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now); // Higher pitch for 'LIGHTS OUT'

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + (isGo ? 0.65 : 0.3));
    } catch {
      // ignore
    }
  }

  public playDrsChirp() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // ignore
    }
  }

  public playCheer() {
    if (!this.ctx || this.isMuted) return;
    try {
      // Grand Prix finish celebration fanfare
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.18, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });
    } catch {
      // ignore
    }
  }

  public stopEngine() {
    this.stopTireSqueal();
    if (this.engineOsc1) {
      try {
        this.engineOsc1.stop();
        this.engineOsc2?.stop();
        this.engineSub?.stop();
      } catch {
        // ignore
      }
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineSub = null;
    }
    this.isRunning = false;
  }
}

export const sound = new SoundEngine();
