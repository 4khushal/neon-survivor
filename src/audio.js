export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.muted = false;
    this.masterGain = null;
    this.sounds = {};
    this.init();
  }

  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;
      this.createSounds();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  createSounds() {
    this.sounds = {
      shoot: () => this.playTone(440, 0.08, 'square', 0.3),
      shootFast: () => this.playTone(660, 0.05, 'square', 0.2),
      hit: () => this.playTone(220, 0.15, 'sawtooth', 0.25),
      enemyHit: () => this.playTone(180, 0.1, 'triangle', 0.2),
      enemyDeath: () => this.playNoise(0.15, 0.3),
      xpPickup: () => this.playArpeggio([523, 659, 784], 0.08, 0.25),
      levelUp: () => this.playArpeggio([261, 329, 392, 523, 659], 0.1, 0.3),
      powerup: () => this.playArpeggio([440, 554, 659, 880], 0.08, 0.25),
      damage: () => this.playTone(120, 0.3, 'sawtooth', 0.3),
      gameOver: () => this.playArpeggio([220, 185, 165, 147], 0.2, 0.4),
      menuSelect: () => this.playTone(880, 0.08, 'sine', 0.15),
      menuNavigate: () => this.playTone(440, 0.05, 'sine', 0.1)
    };
  }

  playTone(frequency, duration, type = 'sine', volume = 0.2) {
    if (!this.audioContext || this.muted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  playNoise(duration, volume = 0.2) {
    if (!this.audioContext || this.muted) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.start(now);
    source.stop(now + duration);
  }

  playArpeggio(frequencies, noteDuration, volume = 0.2) {
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;
    frequencies.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume;

      osc.connect(gain);
      gain.connect(this.masterGain);

      const noteStart = now + i * noteDuration;
      const noteEnd = noteStart + noteDuration;
      gain.gain.setValueAtTime(volume, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.start(noteStart);
      osc.stop(noteEnd);
    });
  }

  play(name) {
    if (this.sounds[name]) {
      this.sounds[name]();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const audio = new AudioManager();