// Realistic Web Audio Engine & Nextbot Spatial Music Engine
// Supports custom audio streaming + procedural fallback synthesis

// =========================================================================
// 🎚️ НАСТРОЙКИ ГРОМКОСТИ (AUDIO CONFIG)
// Ты можешь напрямую менять эти коэффициенты (от 0.0 до 5.0) под свои колонки:
// =========================================================================
export const AUDIO_CONFIG = {
  footstepsVolume: 2.2,     // Громкость шагов игрока (увеличь до 2.8 - 3.5 если хочешь ещё громче)
  heartbeatVolume: 2.5,     // Громкость сердцебиения при приближении девушки
  chaseMusicVolume: 1.0,    // Громкость музыки погони
  sfxVolume: 1.2            // Громкость предметов и взрывов
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.8;
    this.ambientGain = null;
    this.heartbeatTimer = null;
    this.heartbeatActive = false;
    this.initialized = false;

    // Procedural chase synth
    this.proceduralChaseGain = null;
    this.isProceduralMusicPlaying = false;
    this.proceduralChaseTimer = null;
    this.useProceduralChase = true;
    this.currentChaseGain = 0;
    this.proceduralNoteIndex = 0;

    // External HTML5 Audio element for custom Nextbot music
    this.customAudio = null;
    this.hasCustomMusic = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initAmbient();
      this.initProceduralChaseMusic();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    if (this.customAudio) {
      this.customAudio.volume = this.volume;
    }
  }

  setCustomAudioElement(audioEl) {
    this.customAudio = audioEl;
    if (this.customAudio) {
      this.customAudio.loop = true;
      this.customAudio.addEventListener('ended', () => {
        this.customAudio.currentTime = 0;
        this.customAudio.play().catch(() => {});
      });
    }
  }

  setHasCustomMusic(hasCustom) {
    this.hasCustomMusic = hasCustom;
    if (hasCustom) {
      // Mute procedural chase synth
      if (this.proceduralChaseGain && this.ctx) {
        this.proceduralChaseGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }
  }

  initAmbient() {
    if (!this.ctx) return;
    // Low atmospheric rumble / ventilation hum
    const osc1 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    this.ambientGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(50, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.ambientGain.gain.setValueAtTime(0.035, this.ctx.currentTime);

    osc1.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    osc1.start();
  }

  // Nextbot Procedural Chase Synth (Catchy Upbeat Nextbot Bassline Loop)
  initProceduralChaseMusic() {
    if (!this.ctx) return;
    this.proceduralChaseGain = this.ctx.createGain();
    this.proceduralChaseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.proceduralChaseGain.connect(this.masterGain);
  }

  startProceduralChaseLoop() {
    if (this.isProceduralMusicPlaying || !this.ctx) return;
    this.isProceduralMusicPlaying = true;

    // 138 BPM driving bass notes (E minor / Nextbot meme vibe)
    const bpm = 138;
    const stepTime = 60 / bpm / 2; // eighth notes
    const bassline = [
      41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 46.25, // E1, E1, B1, E1, A1, E1, B1, Bb1
      41.2, 41.2, 61.74, 55.0, 49.0, 41.2, 36.71, 38.89 // E1, E1, D2, A1, B1, E1, D1, Eb1
    ];

    const playStep = () => {
      if (!this.isProceduralMusicPlaying || !this.ctx) return;
      if (!this.hasCustomMusic) {
        const freq = bassline[this.proceduralNoteIndex % bassline.length];
        this.synthBassHit(freq, stepTime * 0.85);

        // Hi-hat click on off-beats
        if (this.proceduralNoteIndex % 2 === 1) {
          this.synthHiHat();
        }
      }
      this.proceduralNoteIndex++;
      this.proceduralChaseTimer = setTimeout(playStep, stepTime * 1000);
    };
    playStep();
  }

  stopProceduralChaseLoop() {
    this.isProceduralMusicPlaying = false;
    if (this.proceduralChaseTimer) {
      clearTimeout(this.proceduralChaseTimer);
      this.proceduralChaseTimer = null;
    }
    if (this.proceduralChaseGain && this.ctx) {
      this.proceduralChaseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.currentChaseGain = 0;
  }

  resetChaseMusic() {
    this.stopProceduralChaseLoop();
    this.proceduralNoteIndex = 0;
    this.currentChaseGain = 0;

    if (this.customAudio) {
      try {
        this.customAudio.pause();
        this.customAudio.currentTime = 0;
      } catch (e) {}
    }
  }

  synthBassHit(freq, duration) {
    if (!this.ctx || this.currentChaseGain < 0.005) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 2, now); // Octave punch

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.proceduralChaseGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  synthHiHat() {
    if (!this.ctx || this.currentChaseGain < 0.005) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.proceduralChaseGain);

    noise.start(now);
  }

  // Updates spatial music volume based on distance to Nextbot girl
  updateChaseDistance(distance, maxDistance = 35) {
    if (!this.ctx || !this.initialized) return;

    // Distance attenuation factor: 0 when far, 1 when close
    const prox = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
    const volumeCurve = Math.pow(prox, 1.35); // punchy ramp-up as she gets closer

    // 1. If custom MP3 audio is playing
    if (this.hasCustomMusic && this.customAudio) {
      if (this.customAudio.paused && prox > 0) {
        this.customAudio.play().catch(() => {});
      }
      this.customAudio.volume = Math.max(0, Math.min(1, volumeCurve * this.volume));
    } else {
      // 2. Procedural Nextbot chase music
      this.currentChaseGain = volumeCurve * 0.85;
      if (!this.isProceduralMusicPlaying && prox > 0.05) {
        this.startProceduralChaseLoop();
      }
      if (this.proceduralChaseGain) {
        this.proceduralChaseGain.gain.setTargetAtTime(this.currentChaseGain, this.ctx.currentTime, 0.08);
      }
    }

    // Also update Heartbeat
    this.updateHeartbeat(distance, maxDistance);
  }

  // Realistic Visceral Heartbeat (Lub-Dub Dual-Tone)
  updateHeartbeat(distance, maxDistance = 28) {
    if (!this.ctx || !this.initialized) return;

    if (distance > maxDistance) {
      this.nextHeartbeatInterval = null;
      return;
    }

    const prox = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
    // Heartbeat rate: from 68 BPM (1.1s) up to 180 BPM (0.33s)
    this.nextHeartbeatInterval = 1.15 - (prox * 0.82);
    // Base volume elevated and scaled by user config
    this.heartbeatVolume = (0.5 + Math.pow(prox, 1.1) * 0.95) * (AUDIO_CONFIG.heartbeatVolume || 2.2);

    if (!this.heartbeatActive) {
      this.startHeartbeatLoop();
    }
  }

  startHeartbeatLoop() {
    this.heartbeatActive = true;
    const beat = () => {
      if (!this.heartbeatActive || !this.nextHeartbeatInterval) {
        this.heartbeatActive = false;
        return;
      }
      // S1: Lub (Deep punchy cardiac thump with mid-bass harmonics for speaker audibility)
      this.playRealLub(this.heartbeatVolume);

      // S2: Dub (Higher cardiac snap, 130ms later)
      setTimeout(() => {
        if (this.heartbeatActive) {
          this.playRealDub(this.heartbeatVolume * 0.85);
        }
      }, 130);

      const delay = (this.nextHeartbeatInterval || 1.0) * 1000;
      this.heartbeatTimer = setTimeout(beat, delay);
    };
    beat();
  }

  stopHeartbeat() {
    this.heartbeatActive = false;
    this.nextHeartbeatInterval = null;
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  playRealLub(vol = 1.0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Fundamental sub-bass: 105Hz sliding to 48Hz (audible on phone/laptop speakers)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(105, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);

    // Warm mid-bass body overtone (triangle) for speaker presence
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(65, now + 0.18);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    const peakVol = Math.min(1.8, vol * 0.75);
    gain.gain.setValueAtTime(peakVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.21);
    subOsc.stop(now + 0.21);
  }

  playRealDub(vol = 0.8) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // S2 Snap: slightly higher pitch
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(56, now + 0.13);

    const midOsc = this.ctx.createOscillator();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(185, now);
    midOsc.frequency.exponentialRampToValueAtTime(75, now + 0.14);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.Q.setValueAtTime(2.2, now);

    const gain = this.ctx.createGain();
    const peakVol = Math.min(1.6, vol * 0.65);
    gain.gain.setValueAtTime(peakVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    midOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    midOsc.start(now);
    osc.stop(now + 0.16);
    midOsc.stop(now + 0.16);
  }

  // Realistic Sneaker Footstep on Tile (punchy & audible)
  playFootstep(isRunning = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const stepMultiplier = AUDIO_CONFIG.footstepsVolume || 2.2;

    // 1. Solid Impact Thud (Heel hitting ground - audible range 125-155Hz)
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(isRunning ? 150 : 125, now);
    thud.frequency.exponentialRampToValueAtTime(45, now + 0.11);

    const thudLevel = Math.min(1.5, (isRunning ? 0.48 : 0.36) * stepMultiplier);
    thudGain.gain.setValueAtTime(thudLevel, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.13);

    // 2. Mid Sole Slap (Floor tap at 320Hz)
    const slap = this.ctx.createOscillator();
    const slapGain = this.ctx.createGain();
    slap.type = 'triangle';
    slap.frequency.setValueAtTime(isRunning ? 340 : 280, now);
    slap.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    const slapLevel = Math.min(1.0, (isRunning ? 0.28 : 0.20) * stepMultiplier);
    slapGain.gain.setValueAtTime(slapLevel, now);
    slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    slap.connect(slapGain);
    slapGain.connect(this.masterGain);
    slap.start(now);
    slap.stop(now + 0.1);

    // 3. High-Frequency Sole Friction / Scuff
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isRunning ? 1600 : 1200, now);
    filter.Q.setValueAtTime(2.2, now);

    const scuffGain = this.ctx.createGain();
    const scuffLevel = Math.min(0.9, (isRunning ? 0.30 : 0.20) * stepMultiplier);
    scuffGain.gain.setValueAtTime(scuffLevel, now);
    scuffGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    noise.connect(filter);
    filter.connect(scuffGain);
    scuffGain.connect(this.masterGain);

    noise.start(now);
  }

  // Inventory & Item SFX
  playPickup() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Bright upward bell arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.22, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.22);
    });
  }

  playDrinkEnergy() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Can crack / fizz + power charge synth
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  playDropDecoy() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Squeak + cushion impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playShieldBlast() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Heavy sub-bass shockwave impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.6);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.68);
  }

  playGameOver() {
    if (!this.ctx) return;
    this.stopHeartbeat();
    this.stopProceduralChaseLoop();

    if (this.customAudio) {
      this.customAudio.pause();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.9);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  // Golden Key Pickup: Sparkling magical chime
  playKeyPickup() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22]; // E5, G#5, B5, E6, G#6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.3, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.38);
    });
  }

  // Heavy locked metallic door rattle
  playDoorLocked() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Heavy vault door unlatch & opening hum
  playDoorOpen() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Metallic clank followed by power hum
    const clank = this.ctx.createOscillator();
    const clankGain = this.ctx.createGain();
    clank.type = 'triangle';
    clank.frequency.setValueAtTime(480, now);
    clank.frequency.exponentialRampToValueAtTime(110, now + 0.35);
    clankGain.gain.setValueAtTime(0.5, now);
    clankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    clank.connect(clankGain);
    clankGain.connect(this.masterGain);
    clank.start(now);
    clank.stop(now + 0.45);

    // Deep hydraulic opening hum
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(80, now + 0.1);
    hum.frequency.exponentialRampToValueAtTime(180, now + 0.9);
    humGain.gain.setValueAtTime(0.001, now + 0.1);
    humGain.gain.linearRampToValueAtTime(0.35, now + 0.35);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    hum.connect(humGain);
    humGain.connect(this.masterGain);
    hum.start(now + 0.1);
    hum.stop(now + 1.25);
  }

  // Nextbot OOB Recovery / Jumpscare Scream
  playNextbotRespawn() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  // Set Map Mode ('maze' or 'crater')
  setMapMode(mode = 'maze') {
    this.isVolcanoMode = (mode === 'crater');
    if (this.customAudio) {
      // In volcano, music plays slightly slowed down and pitched down ("плавящийся динамик")
      this.customAudio.playbackRate = this.isVolcanoMode ? 0.86 : 1.0;
    }
  }

  // 🚨 Emergency Alarm Siren (When Key 1 is picked up in Crater and Magma rises)
  playSirenAlarm() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    // Two-tone rising/falling siren wail (3 cycles)
    for (let c = 0; c < 3; c++) {
      const t = now + c * 0.9;
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(940, t + 0.45);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.9);
    }

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 2.85);
  }

  // 🚀 Rocket Jump (RTX 5090 Super Jump against wall / in volcano)
  playRocketJump() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Concussive bass explosion
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(220, now);
    boom.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    boomGain.gain.setValueAtTime(0.9, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    boom.connect(boomGain);
    boomGain.connect(this.masterGain);
    boom.start(now);
    boom.stop(now + 0.42);

    // Rocket whistling propulsion ascent
    const whoosh = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(300, now + 0.05);
    whoosh.frequency.exponentialRampToValueAtTime(1400, now + 0.45);
    whooshGain.gain.setValueAtTime(0.001, now);
    whooshGain.gain.linearRampToValueAtTime(0.5, now + 0.1);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    whoosh.connect(whooshGain);
    whooshGain.connect(this.masterGain);
    whoosh.start(now + 0.05);
    whoosh.stop(now + 0.52);
  }

  // ⚡ Double Jump (Monster Energy air jump)
  playDoubleJump() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.22);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  // 🧗 Crumbling Ledge Warning (Tremor / Vibration)
  playCrumbleWarning() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  // 💥 Rock Collapse into Magma
  playRockCollapse() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.68);
  }

  // 🌋 Magma Geyser Eruption
  playGeyserErupt() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(60, now + 1.1);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  // 😱 Nextbot Center Leap Screech
  playNextbotLeap() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.9);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  // 🎲 D20 Miracle Rescue from Magma
  playD20Save() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.35, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.48);
    });
  }

  // ⛩️ Torii Gate Countdown Beep
  playToriiBeep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // ⛩️ Torii Gate Final Activation Warp
  playToriiActivate() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(1550, now + 0.8);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.95);
  }

  // 🌋 Magma sizzle & death sound
  playMagmaDeath() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(200, now + 1.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  // Victory: Stops all chase music, heartbeat and sounds so video plays cleanly with its own audio
  playVictory() {
    this.stopHeartbeat();
    this.stopProceduralChaseLoop();
    this.resetChaseMusic();

    if (this.customAudio) {
      try {
        this.customAudio.pause();
        this.customAudio.currentTime = 0;
      } catch (e) {}
    }
  }
}

export const soundEngine = new SoundEngine();

