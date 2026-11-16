// Sound only: every effect is synthesised with WebAudio, so the game ships no audio files.
// The context is created on the first user gesture (browsers block sound before one) and
// every call is guarded, so a headless run or a muted tab never throws.

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5, G6: 1568.0 };

export function createAudio() {
  let context = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, start, duration, type, volume, slideTo) {
    if (!ensure() || context.state === 'suspended') return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime + start;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + duration);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  function thud() {
    if (!ensure() || context.state === 'suspended') return;
    try {
      const duration = 0.22;
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = context.createBufferSource();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      gain.gain.value = 0.5;
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
      this.startPad();
    },
    /** A soft two-note pad under the night; started once, after the first gesture. */
    startPad() {
      if (!ensure() || padNodes !== null || context.state === 'suspended') return;
      try {
        const gain = context.createGain();
        gain.gain.value = 0.045;
        gain.connect(master);
        const oscs = [110, 164.81].map((freq) => {
          const osc = context.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          osc.start();
          return osc;
        });
        const lfo = context.createOscillator();
        const lfoGain = context.createGain();
        lfo.frequency.value = 0.07;
        lfoGain.gain.value = 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();
        padNodes = { oscs, lfo, gain };
      } catch {
        padNodes = null;
      }
    },
    setMuted(value) {
      muted = value;
      if (master !== null) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** A pickup chime that climbs with the trail, so a long chain sounds richer. */
    pickup(chain) {
      const base = NOTE.E5 * 2 ** (Math.min(chain, 8) / 12);
      tone(base, 0, 0.16, 'sine', 0.22);
      tone(base * 1.5, 0.02, 0.14, 'sine', 0.12);
    },
    deliver(count) {
      const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], i * 0.07, 0.3, 'triangle', 0.22);
      if (count >= 8) tone(NOTE.E6, 0.3, 0.5, 'sine', 0.2);
    },
    dispel() {
      tone(NOTE.G6, 0, 0.12, 'square', 0.1, NOTE.C6);
      tone(NOTE.C6, 0.05, 0.2, 'sine', 0.18);
    },
    hit() {
      thud();
      tone(196, 0, 0.3, 'sawtooth', 0.16, 98);
    },
    dash() {
      tone(880, 0, 0.14, 'sine', 0.1, 220);
    },
    night() {
      tone(NOTE.A5, 0, 0.4, 'sine', 0.16);
      tone(NOTE.E6, 0.12, 0.5, 'sine', 0.14);
    },
    win() {
      const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], i * 0.11, 0.5, 'triangle', 0.2);
    },
    over() {
      const notes = [NOTE.A5, NOTE.G5, NOTE.E5, NOTE.C5];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], i * 0.16, 0.4, 'sine', 0.16);
    },
  };
}
