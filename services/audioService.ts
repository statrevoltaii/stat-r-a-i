
export class AudioService {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;

  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime); // Boost volume

      // Start a low background drone to ensure audio stream is active
      this.startDrone();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) { }
    }
  }

  private startDrone() {
    if (!this.ctx || !this.masterGain) return;
    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();

    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.setValueAtTime(50, this.ctx.currentTime); // Low rumble

    this.droneGain.gain.setValueAtTime(0.05, this.ctx.currentTime); // Very quiet but present

    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc.start();
  }

  public resume() {
    this.init();
  }

  public playScan(progress: number, color: string) {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // Create a "digital droplet" / "data packet" sound
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator(); // Modulator for FM effect
    const modGain = this.ctx.createGain();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Base pitch rises slightly with progress
    const basePitch = 400 + (progress * 5);

    // Carrier
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch, now);

    // Modulator (FM synthesis for "tech" feel)
    mod.type = 'square';
    mod.frequency.setValueAtTime(basePitch * 2, now); // Octave above

    // Modulation depth
    modGain.gain.setValueAtTime(300, now);
    modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    // Filter
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(basePitch * 1.5, now);
    filter.Q.value = 5;

    // Envelope (Short, percussive)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Wiring: Mod -> ModGain -> Carrier.freq
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    mod.start(now);
    osc.stop(now + 0.2);
    mod.stop(now + 0.2);
  }

  public playComplete() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Epic Final Chord (Major 7th Add 9 for a modern tech sound)
    const frequencies = [261.63, 329.63, 392.00, 493.88, 587.33];

    frequencies.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.02);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);

      env.gain.setValueAtTime(0, now + i * 0.02);
      env.gain.linearRampToValueAtTime(0.12, now + i * 0.02 + 0.1);
      env.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.masterGain!);

      osc.start(now + i * 0.02);
      osc.stop(now + 3);
    });
  }
}

export const audioService = new AudioService();
