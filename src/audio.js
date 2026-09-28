const BIOME_CHORDS = {
  'neon-city': [55, 82.4069, 110, 164.8138],
  'overgrown-circuit': [65.4064, 98, 130.8128, 196],
  'void-factory': [51.9131, 77.7817, 103.8262, 155.5635],
  'frozen-rift': [73.4162, 110, 146.8324, 220],
  'magma-core': [43.6535, 65.4064, 87.3071, 130.8128],
  'storm-spire': [61.7354, 92.4986, 123.4708, 184.9972],
  'void-cathedral': [58.2705, 87.3071, 116.5409, 174.6141],
  'final-rift': [49, 73.4162, 98, 146.8324],
};
const clamp = n => Math.max(0, Math.min(1, Number.isFinite(Number(n)) ? Number(n) : 0));

/** A small original synthesizer: no files, network requests, or audio dependencies. */
export function createAudio(initialSettings = {}) {
  let settings = initialSettings;
  let context;
  let master;
  let effects;
  let music;
  let compressor;
  let ambient = [];
  let biome = 'neon-city';
  let stopped = false;
  let activeVoices = 0;
  const lastPlayed = new Map();
  const listeners = [];

  function gainValue(kind) {
    if (settings.muted || settings.audio === false || settings.sound === false) return 0;
    const value = kind === 'master' ? settings.masterVolume ?? settings.volume ?? 0.55 : kind === 'music' ? settings.musicVolume ?? settings.music ?? 0.4 : settings.sfxVolume ?? settings.sfx ?? 0.65;
    if (typeof value === 'boolean') return value ? 0.6 : 0;
    const numeric = Number(value);
    return clamp(numeric > 1 ? numeric / 100 : numeric);
  }
  function updateVolumes() {
    if (!context) return;
    const t = context.currentTime;
    master.gain.setTargetAtTime(gainValue('master'), t, 0.04);
    effects.gain.setTargetAtTime(gainValue('effects') * 0.7, t, 0.04);
    music.gain.setTargetAtTime(gainValue('music') * 0.22, t, 0.3);
  }
  function makeAmbient() {
    if (!context || stopped) return;
    const now = context.currentTime;
    for (const voice of ambient) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, 0.3);
      try { voice.oscillator.stop(now + 1.5); } catch { /* already stopped */ }
    }
    ambient = [];
    const chord = BIOME_CHORDS[biome] || BIOME_CHORDS['neon-city'];
    chord.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      oscillator.type = index < 2 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 === 0 ? -4 : 4;
      filter.type = 'lowpass'; filter.frequency.value = biome === 'magma-core' ? 400 : biome === 'frozen-rift' ? 1200 : 700;
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(index === 0 ? 0.18 : 0.06, now, 0.8);
      oscillator.connect(filter); filter.connect(gain); gain.connect(music);
      oscillator.start();
      oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
      ambient.push({ oscillator, gain });
    });
  }
  function boot() {
    if (stopped || typeof window === 'undefined') return null;
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        context = new AudioContextClass();
        master = context.createGain(); effects = context.createGain(); music = context.createGain();
        compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -12; compressor.knee.value = 12; compressor.ratio.value = 6;
        effects.connect(master); music.connect(master); master.connect(compressor); compressor.connect(context.destination);
        updateVolumes(); makeAmbient();
      } catch { context = undefined; return null; }
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }
  function tone(frequency, duration, type = 'sine', gain = 0.15, endFrequency, delay = 0) {
    if (!context || activeVoices >= 24) return;
    activeVoices++;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.002, gain), start + Math.min(0.012, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(envelope); envelope.connect(effects);
    oscillator.start(start); oscillator.stop(start + duration + 0.03);
    oscillator.onended = () => { activeVoices = Math.max(0, activeVoices - 1); oscillator.disconnect(); envelope.disconnect(); };
  }
  function noise(duration, gain = 0.1, cutoff = 1000, delay = 0) {
    if (!context || activeVoices >= 24) return;
    activeVoices++;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    // Noise is cosmetic and never shares gameplay RNG.
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource(); source.buffer = buffer;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
    const envelope = context.createGain(); envelope.gain.value = gain;
    source.connect(filter); filter.connect(envelope); envelope.connect(effects);
    source.start(context.currentTime + delay);
    source.onended = () => { activeVoices = Math.max(0, activeVoices - 1); source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
  function arpeggio(notes, duration = 0.18, type = 'sine', gain = 0.15) {
    notes.forEach((note, index) => tone(note, duration * 1.8, type, gain, undefined, index * duration * 0.6));
  }
  function play(event) {
    stopped = false;
    const type = typeof event === 'string' ? event : event?.type;
    if (!type || !boot()) return;
    const now = context.currentTime;
    const throttle = type === 'shot' ? 0.065 : type === 'hit' || type === 'kill' ? 0.1 : type === 'crit' ? 0.08 : 0.03;
    if (lastPlayed.has(type) && now - lastPlayed.get(type) < throttle) return;
    lastPlayed.set(type, now);
    if (gainValue('effects') === 0 || gainValue('master') === 0) return;
    switch (type) {
      case 'shot': {
        const weapon = event?.weapon || '';
        if (/rail|tesla|lightning/.test(weapon)) { tone(940, 0.09, 'sawtooth', 0.045, 130); noise(0.045, 0.025, 3000); }
        else if (/cryo|ice/.test(weapon)) tone(1700, 0.07, 'sine', 0.06, 840);
        else if (/gravity|black/.test(weapon)) tone(90, 0.17, 'sine', 0.12, 38);
        else if (/solar|brand|fire/.test(weapon)) { tone(220, 0.13, 'triangle', 0.06, 75); noise(0.07, 0.02, 850); }
        else if (/drone|sentinel/.test(weapon)) tone(720, 0.045, 'triangle', 0.045, 540);
        else if (/boomerang/.test(weapon)) tone(480, 0.12, 'sine', 0.065, 860);
        else tone(670, 0.05, 'triangle', 0.055, 260);
        break;
      }
      case 'hit': noise(0.04, 0.045, 600); tone(130, 0.05, 'sine', 0.05, 60); break;
      case 'crit': tone(1200, 0.07, 'triangle', 0.08, 500); break;
      case 'kill': tone(180, 0.075, 'triangle', 0.05, 55); break;
      case 'boss-defeated': case 'boss-kill': noise(0.6, 0.25, 800); arpeggio([130.81, 196, 261.63, 392, 523.25], 0.2, 'triangle', 0.12); break;
      case 'shield-break': noise(0.24, 0.2, 4500); tone(780, 0.22, 'sine', 0.14, 70); break;
      case 'dodge': tone(1000, 0.08, 'sine', 0.07, 1800); break;
      case 'dash': noise(0.12, 0.12, 2800); tone(180, 0.13, 'sine', 0.08, 620); break;
      case 'ability': arpeggio([220, 329.63, 440], 0.085, 'triangle', 0.13); break;
      case 'evolution': arpeggio([261.63, 329.63, 392, 523.25, 783.99], 0.16, 'triangle', 0.13); break;
      case 'mythic': arpeggio([392, 493.88, 587.33, 783.99, 987.77, 1174.66], 0.18, 'sine', 0.16); break;
      case 'boss-spawn': tone(130.81, 0.35, 'triangle', 0.12, 65.41); tone(196, 0.35, 'sine', 0.08, undefined, 0.2); break;
      case 'boss-phase': tone(82.41, 0.7, 'sawtooth', 0.13, 61.74); tone(164.81, 0.7, 'sine', 0.1, 123.47); break;
      case 'encounter-complete': arpeggio([329.63, 440, 523.25], 0.16, 'sine', 0.13); break;
      case 'death': case 'gameover': arpeggio([261.63, 220, 164.81, 130.81], 0.23, 'triangle', 0.11); break;
      case 'victory': arpeggio([261.63, 329.63, 392, 523.25, 659.26, 783.99], 0.21, 'triangle', 0.14); break;
      case 'ui': case 'reward': case 'select': tone(660, 0.08, 'sine', 0.09); tone(880, 0.11, 'sine', 0.07, undefined, 0.05); break;
      case 'start': arpeggio([130.81, 196, 261.63], 0.1, 'triangle', 0.08); break;
      case 'purchase': arpeggio([523.25, 783.99], 0.07, 'sine', 0.09); break;
      case 'quest-complete': arpeggio([440, 554.37, 659.25], 0.13, 'sine', .1); break;
      case 'player-downed': tone(155.56, .3, 'triangle', .12, 77.78); break;
      case 'player-revived': arpeggio([261.63, 392, 523.25], .14, 'sine', .12); break;
      case 'synergy': case 'ultimate': arpeggio([329.63, 493.88, 659.25, 987.77], .1, 'triangle', .11); break;
      case 'world-event': tone(392, .18, 'sine', .08); tone(523.25, .2, 'sine', .08, undefined, .12); break;
      default: break;
    }
  }
  if (typeof window !== 'undefined') {
    const unlock = () => boot();
    const visibility = () => {
      if (!context) return;
      if (document.hidden) context.suspend().catch(() => {});
      else if (!stopped) context.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    listeners.push(() => window.removeEventListener('pointerdown', unlock), () => window.removeEventListener('keydown', unlock), () => document.removeEventListener('visibilitychange', visibility));
  }
  return {
    play,
    setSettings(value) { settings = value || {}; updateVolumes(); },
    setBiome(id) { if (biome !== id) { biome = id; if (context) makeAmbient(); } },
    stop() {
      stopped = true;
      for (const voice of ambient) { try { voice.oscillator.stop(); } catch { /* already stopped */ } }
      ambient = [];
      context?.close().catch(() => {});
      context = undefined;
      lastPlayed.clear();
      activeVoices = 0;
    },
    destroy() { this.stop(); for (const dispose of listeners) dispose(); },
  };
}
