'use strict';
// ============================================================
//  AUDIO: efectos sintetizados + música chiptune (mariachi de 8 bits)
// ============================================================
const Audio8 = {
  ctx: null, master: null, sfxGain: null, musGain: null, noiseBuf: null,
  muted: false, musicOn: true, song: null, nextStep: 0, step: 0,
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.buildOut();
        this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.55; this.sfxGain.connect(this.master);
        this.musGain = this.ctx.createGain(); this.musGain.gain.value = this.musicOn ? this.MUS_GAIN : 0; this.musGain.connect(this.master);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        try { const m = localStorage.getItem('golpazo-muted'); if (m === '1') this.setMuted(true); if (m === 'fx') this.setSound('fx'); } catch (e) {}
      }
      if (this.ctx.state === 'suspended') { const p = this.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
      // iPhone: que suene aunque el interruptor de silencio esté puesto (con videollamada lo decide el micrófono)
      try { if (navigator.audioSession && navigator.audioSession.type !== 'play-and-record') navigator.audioSession.type = 'playback'; } catch (e) { /* sin sesión */ }
      // iOS: un búfer mudo dentro del gesto termina de abrir el audio
      if (!this.primed && this.ctx.state !== 'closed') { const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0); this.primed = true; }
    } catch (e) { /* sin audio */ }
  },
  get ready() { return this.ctx && this.ctx.state === 'running'; },
  sfxBus() { return { input: this.sfxGain, send: null, rev: null }; },
  MUS_GAIN: 0.16,
  // salida con compresor: la mezcla nunca satura aunque suenen muchos golpes a la vez
  buildOut() {
    const c = this.ctx, comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.25;
    this.master.connect(comp); comp.connect(c.destination); this.comp = comp;
  },
  duckK: 1,
  masterLevel() { return this.muted ? 0 : 0.7 * this.duckK; },
  setMuted(m) {
    this.muted = m; if (!m) this.setMusic(true);
    if (this.master) this.master.gain.value = this.masterLevel();
    try { localStorage.setItem('golpazo-muted', m ? '1' : '0'); } catch (e) {}
  },
  setMusic(on) { this.musicOn = on; if (this.musGain && this.ctx) this.musGain.gain.setTargetAtTime(on ? this.MUS_GAIN : 0, this.ctx.currentTime, 0.1); },
  // Sonido: todo → solo efectos (sin música) → nada
  soundMode() { return this.muted ? 'off' : this.musicOn ? 'all' : 'fx'; },
  setSound(mode) {
    this.muted = mode === 'off'; this.setMusic(mode === 'all');
    if (this.master) this.master.gain.value = this.masterLevel();
    try { localStorage.setItem('golpazo-muted', mode === 'off' ? '1' : mode === 'fx' ? 'fx' : '0'); } catch (e) {}
  },
  cycleSound() { const m = this.soundMode(); this.setSound(m === 'all' ? 'fx' : m === 'fx' ? 'off' : 'all'); },
  // con chat de voz en vivo todo el juego baja 75% para que se oigan entre ustedes
  duckCheck() {
    const live = typeof AV !== 'undefined' && AV.on && AV.count() > 0, k = live ? 0.25 : 1;
    if (k === this.duckK) return;
    this.duckK = k;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.masterLevel(), this.ctx.currentTime, 0.15);
    if (typeof Toasts !== 'undefined') Toasts.push(live ? '🎙️ Chat de voz: el juego baja 75% su volumen' : '🔊 Volumen normal');
  },
  tone(type, f0, f1, dur, vol = 0.3, when = 0, dest) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, freq = 2000, q = 1, when = 0, type = 'bandpass', dest, f1) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  sfx(name, k = 1) {
    if (typeof NetEv !== 'undefined' && NetEv.on) NetEv.push(['s', name, Math.round(k * 10) / 10]);
    if (!this.ready) return;
    switch (name) {
      case 'hit': {
        const p = clamp(k, 0.2, 3);
        this.noise(0.08 + p * 0.05, 0.35 + p * 0.1, 900 + p * 500, 0.8);
        this.tone('square', 180 + p * 40, 50, 0.1 + p * 0.06, 0.18 + p * 0.06);
        if (p > 1.5) this.tone('sawtooth', 90, 30, 0.35, 0.25);
        break;
      }
      case 'bighit':
        this.noise(0.4, 0.6, 700, 0.6, 0, 'lowpass', null, 200);
        this.tone('sawtooth', 140, 35, 0.5, 0.35);
        this.tone('square', 900, 200, 0.15, 0.12);
        break;
      case 'swing': this.noise(0.12, 0.12 * k, 2400, 1.4, 0, 'bandpass', null, 900); break;
      case 'jump': this.tone('square', 260, 520, 0.1, 0.08); break;
      case 'djump': this.tone('square', 330, 700, 0.12, 0.08); break;
      case 'land': this.noise(0.06, 0.12, 400, 1); break;
      case 'shield': this.tone('triangle', 900, 1400, 0.08, 0.12); break;
      case 'shieldbreak': this.tone('square', 600, 80, 0.8, 0.2); this.noise(0.5, 0.3, 3000, 0.5); break;
      case 'dodge': this.noise(0.1, 0.1, 3500, 2); break;
      case 'grab': this.tone('square', 200, 160, 0.06, 0.12); break;
      case 'throw': this.noise(0.14, 0.2, 1400, 1, 0, 'bandpass', null, 500); break;
      case 'pickup': this.tone('square', 660, 660, 0.05, 0.1); this.tone('square', 990, 990, 0.08, 0.1, 0.05); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.14, i * 0.06)); break;
      case 'star': [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => this.tone('square', f, f, 0.08, 0.07, i * 0.05)); break;
      case 'grow': this.tone('square', 200, 800, 0.5, 0.12); break;
      case 'shrink': this.tone('square', 800, 200, 0.4, 0.12); break;
      case 'laser': this.tone('sawtooth', 1800, 300, 0.12, 0.1); break;
      case 'shoot': this.tone('square', 900, 400, 0.08, 0.1); this.noise(0.05, 0.1, 3000, 1); break;
      case 'fire': this.noise(0.25, 0.22, 900, 0.5, 0, 'lowpass', null, 300); break;
      case 'explosion':
        this.noise(0.7, 0.7, 1200, 0.4, 0, 'lowpass', null, 80);
        this.tone('sine', 120, 30, 0.6, 0.5);
        break;
      case 'ko':
        this.noise(1.2, 0.8, 2400, 0.3, 0, 'lowpass', null, 60);
        this.tone('sawtooth', 300, 40, 1.0, 0.35);
        this.tone('sine', 80, 25, 1.1, 0.6);
        break;
      case 'charge': this.tone('triangle', 300 + k * 600, 320 + k * 620, 0.05, 0.05); break;
      case 'orb': [523, 784, 1046, 1568, 2093].forEach((f, i) => this.tone('square', f, f, 0.15, 0.09, i * 0.07)); break;
      case 'final': this.tone('sawtooth', 110, 880, 1.0, 0.25); this.noise(1.0, 0.3, 500, 0.5, 0, 'bandpass', null, 5000); break;
      case 'menu': this.tone('square', 660, 660, 0.04, 0.07); break;
      case 'confirm': this.tone('square', 523, 523, 0.06, 0.1); this.tone('square', 1046, 1046, 0.1, 0.1, 0.06); break;
      case 'back': this.tone('square', 440, 220, 0.1, 0.08); break;
      case 'count': this.tone('square', 440, 440, 0.18, 0.15); break;
      case 'go': this.tone('square', 880, 880, 0.5, 0.15); this.tone('square', 660, 660, 0.5, 0.1); break;
      case 'warn': this.tone('square', 740, 740, 0.12, 0.12); this.tone('square', 740, 740, 0.12, 0.12, 0.2); break;
      case 'wind': this.noise(1.5, 0.25, 500, 0.3, 0, 'bandpass', null, 1500); break;
      case 'rumble': this.noise(1.2, 0.4, 120, 0.5, 0, 'lowpass'); break;
      case 'splash': this.noise(0.6, 0.4, 1600, 0.4, 0, 'lowpass', null, 300); break;
      case 'counter': this.tone('square', 1200, 1200, 0.05, 0.12); this.tone('square', 1600, 1600, 0.12, 0.12, 0.05); break;
      case 'teleport': this.tone('sine', 1500, 200, 0.18, 0.12); break;
      case 'game': this.tone('square', 392, 392, 0.2, 0.15); this.tone('square', 523, 523, 0.2, 0.15, 0.2); this.tone('square', 784, 784, 0.6, 0.15, 0.4); break;
      // del mariachi: se pedían desde el principio pero no existían, así que no sonaban
      case 'trumpet': {
        // "ta-ra-rá" de trompetas en tercera
        const t = this.ctx.currentTime, v = 0.11 * clamp(k, 0.2, 1.5), o = { bus: this.sfxBus(), cut: 2600, cutK: 3.2, cutPeak: 1.8, cutT: 0.1, att: 0.02, dec: 0.08, sus: 0.75, rel: 0.1, vib: 0.008 };
        [[67, 0, 0.09], [72, 0.1, 0.09], [76, 0.2, 0.34]].forEach(([n, d, du]) => { const f = 440 * Math.pow(2, (n - 69) / 12); this.syn(f, t + d, du, v, o); this.syn(f * 1.26, t + d, du, v * 0.55, o); });
        break;
      }
      case 'violin': {
        const t = this.ctx.currentTime, v = 0.07 * clamp(k, 0.2, 1.5), o = { bus: this.sfxBus(), waves: [['sawtooth', -8, 0.4], ['sawtooth', 0, 0.35], ['sawtooth', 9, 0.4]], cut: 2800, cutK: 3.6, att: 0.04, dec: 0.1, sus: 0.85, rel: 0.15, vib: 0.012, vibRate: 5.8 };
        [[76, 0, 0.12], [79, 0.12, 0.3]].forEach(([n, d, du]) => this.syn(440 * Math.pow(2, (n - 69) / 12), t + d, du, v, o));
        break;
      }
      case 'strum': {
        // rasgueo de guitarra: acorde de sol, cuerda por cuerda
        const t = this.ctx.currentTime, v = 0.07 * clamp(k, 0.2, 1.5), o = { bus: this.sfxBus(), waves: [['sawtooth', 0, 0.6], ['triangle', 0, 0.6]], cut: 700, cutK: 9, cutPeak: 5, cutT: 0.12, att: 0.003, dec: 0.12, sus: 0.25, rel: 0.25 };
        [55, 59, 62, 67, 71].forEach((n, i) => this.syn(440 * Math.pow(2, (n - 69) / 12), t + i * 0.016, 0.35, v, o));
        this.noise(0.05, 0.05 * k, 3000, 1, 0);
        break;
      }
      case 'voice': {
        // voz grave que acompaña el rugido
        const t = this.ctx.currentTime, v = 0.16 * clamp(k, 0.2, 1.5);
        this.syn(98, t, 0.5, v, { bus: this.sfxBus(), waves: [['sawtooth', -10, 0.6], ['sawtooth', 12, 0.5], ['square', 0, 0.2]], cut: 900, cutPeak: 1.6, cutT: 0.3, att: 0.05, dec: 0.2, sus: 0.7, rel: 0.25, vib: 0.03, vibRate: 7, scoop: 0.08 });
        break;
      }
    }
  },

  // ---------------- música ----------------
  // Canciones originales "al estilo" de mariachi, balada ochentera y disco-ranchera,
  // escritas nota por nota. 1 paso = semicorchea. Suenan con sintetizador actual:
  // metales y cuerdas filtrados, guitarra pulsada, bajo redondo y sala de reverberación.
  SONGS: {
    menu: {
      title: 'El Golpazo', gain: 1.1, style: 'polka', bar: 8, sp: 0.1136, key: 'G', lead: 'trumpet', harm: true, grito: [[7, 2]],
      chords: 'G G D7 D | G Am/D7 Gmaj7 G | C G Am/D7 D7 | G C D7 G',
      mel: `D5:1 E5:1 F#5:2 G5:4 | D5:2 B4:2 G4:4 | E5:1 F#5:1 G5:2 A5:4 | F#5:2 D5:2 A4:4 |
            B4:1 C5:1 D5:2 G5:2 F#5:2 | E5:2 C5:2 A4:2 F#4:2 | G4:2 B4:2 D5:2 F#5:2 | G5:2 r:6 |
            G5:1 F#5:1 E5:1 D5:1 E5:2 C5:2 | B4:1 C5:1 D5:2 G4:4 | A4:1 B4:1 C5:2 E5:2 D5:2 | F#5:2 A5:2 D5:4 |
            D5:1 E5:1 F#5:2 G5:4 | B5:2 A5:2 G5:2 E5:2 | D5:2 F#5:2 A5:2 C6:2 | B5:4 G5:2 r:2`,
    },
    son: {
      title: 'Son del Golpazo', gain: 1.2, style: 'son', bar: 12, sp: 0.1, key: 'D', lead: 'trumpet', harm: true, up: 2, grito: [[7, 8]],
      chords: 'D D A7 A7 | A7 A7 D D | G G D D | A7 A7 D D',
      mel: `D5:2 F#5:2 A5:2 D6:4 A5:2 | B5:4 A5:4 G5:4 | C#5:2 E5:2 A5:2 G5:4 E5:2 | G5:4 F#5:4 E5:4 |
            A4:2 C#5:2 E5:2 G5:4 E5:2 | C#5:4 E5:4 G5:4 | F#5:2 E5:2 D5:2 A5:4 F#5:2 | D5:8 r:4 |
            B4:2 D5:2 G5:2 B5:4 G5:2 | A5:4 B5:4 G5:4 | F#5:2 A5:2 D6:2 A5:4 F#5:2 | G5:4 F#5:4 D5:4 |
            E5:2 G5:2 A5:2 C#6:4 A5:2 | B5:4 A5:4 G5:4 | F#5:2 A5:2 F#5:2 E5:2 C#5:2 E5:2 | D5:8 r:4`,
    },
    ranchera: {
      title: 'Ranchera del Ring', style: 'disco', bar: 16, sp: 0.119, key: 'F', lead: 'trumpet', harm: true, up: 1,
      chords: 'F F C7 C7 | C7 C7 F F | Bb Bb F F | C7 C7 F F',
      mel: `A4:2 C5:2 F5:4 E5:2 F5:2 G5:4 | A5:4 G5:2 F5:2 C5:8 | Bb4:2 C5:2 E5:4 G5:2 Bb5:2 A5:4 | G5:8 r:4 E5:2 F5:2 |
            G5:4 E5:2 C5:2 Bb4:4 C5:4 | E5:2 G5:2 Bb5:4 A5:4 G5:4 | A5:6 F5:2 C5:4 D5:2 E5:2 | F5:12 r:4 |
            D5:2 F5:2 Bb5:4 A5:2 Bb5:2 C6:4 | D6:4 C6:2 Bb5:2 F5:8 | C5:2 F5:2 A5:4 G5:2 A5:2 C6:4 | A5:8 F5:8 |
            G5:2 A5:2 Bb5:4 C6:2 Bb5:2 A5:4 | G5:4 E5:4 C5:4 E5:4 | F5:4 A5:4 C6:4 A5:4 | F5:12 r:4`,
    },
    balada: {
      title: 'Balada del Nocaut', style: 'ballad', bar: 16, sp: 0.144, key: 'Am', lead: 'voice', up: 1, echo: 3,
      secs: [{ from: 8, to: 16, lead: 'voice', harm: true }],
      chords: 'Am F C G | Am F Dm E7 | F G Em Am | Dm G C E7',
      mel: `E5:6 C5:2 A4:4 B4:2 C5:2 | D5:6 C5:2 A4:8 | G4:2 A4:2 C5:4 E5:4 D5:2 C5:2 | D5:12 r:4 |
            E5:6 C5:2 A4:4 B4:2 C5:2 | F5:6 E5:2 C5:4 A4:2 C5:2 | D5:4 F5:4 A5:4 G5:2 F5:2 | E5:8 G#4:4 B4:4 |
            A5:6 G5:2 F5:4 E5:2 F5:2 | G5:6 F5:2 D5:8 | E5:6 D5:2 B4:4 C5:2 D5:2 | E5:8 A4:4 C5:4 |
            F5:6 E5:2 D5:4 C5:2 D5:2 | G5:4 F5:4 D5:4 B4:4 | C5:4 E5:4 G5:4 C6:4 | B5:8 G#5:8`,
    },
    huapango: {
      title: 'Huapango Turbo', gain: 1.2, style: 'huapango', bar: 12, sp: 0.086, key: 'A', lead: 'trumpet', harm: true, up: 2,
      secs: [{ from: 8, to: 12, lead: 'violin', harm: false }],
      chords: 'A E7 A E7 | D A E7 A | D A E7 A | D A E7 A',
      mel: `E5:2 A5:2 C#6:2 E6:4 C#6:2 | D6:2 B5:2 G#5:2 E5:4 D5:2 | C#5:2 E5:2 A5:2 C#6:2 B5:2 A5:2 | B5:4 G#5:2 E5:6 |
            F#5:2 A5:2 D6:2 D6:4 A5:2 | C#6:2 A5:2 E5:2 A5:4 C#6:2 | B5:2 A5:2 G#5:2 F#5:2 E5:2 D5:2 | C#5:4 E5:2 A5:6 |
            F#5:1 A5:1 D6:1 A5:1 F#5:1 A5:1 D6:2 C#6:1 B5:1 A5:2 | E5:1 A5:1 C#6:1 A5:1 E5:1 A5:1 C#6:2 B5:1 A5:1 G#5:2 |
            B4:1 D5:1 E5:1 G#5:1 B5:1 D6:1 E6:2 D6:1 B5:1 G#5:2 | A5:1 B5:1 C#6:1 B5:1 A5:1 G#5:1 A5:1 E5:1 C#5:1 E5:1 A5:2 |
            D6:2 C#6:1 B5:1 A5:2 F#5:2 A5:2 D6:2 | C#6:2 B5:1 A5:1 E5:2 C#5:2 E5:2 A5:2 |
            G#5:1 A5:1 B5:1 C#6:1 D6:1 E6:1 D6:1 C#6:1 B5:1 G#5:1 E5:2 | A5:4 E5:2 A4:2 r:4`,
    },
    vals: {
      title: 'Vals del Último Round', gain: 1.7, style: 'waltz', bar: 12, sp: 0.085, key: 'C', lead: 'violin', harm: true, up: 2,
      chords: 'C C G7 G7 | G7 G7 C C | F F C C | G7 G7 C C',
      mel: `E5:4 G5:4 C6:4 | B5:4 A5:4 G5:4 | F5:4 A5:4 D6:4 | C6:4 B5:4 G5:4 |
            D5:4 F5:4 B5:4 | A5:4 G5:4 F5:4 | E5:8 D5:4 | C5:12 |
            C5:4 F5:4 A5:4 | C6:8 A5:4 | G5:4 E5:4 C5:4 | E5:8 G5:4 |
            F5:4 E5:4 D5:4 | B5:4 A5:4 G5:4 | C6:8 G5:4 | C6:12`,
    },
    results: {
      title: 'Diana del Campeón', gain: 1.2, style: 'march', bar: 16, sp: 0.12, key: 'C', lead: 'trumpet', harm: true, loopFrom: 4,
      secs: [{ from: 4, to: 8, lead: 'violin', harm: false }],
      chords: 'C F/G7 C/G7 C | C F G7 C',
      mel: `G4:2 C5:2 E5:2 G5:4 E5:2 G5:4 | A5:4 G5:2 F5:2 E5:4 D5:4 | E5:2 G5:2 C6:4 B5:2 A5:2 G5:2 D5:2 | C6:8 G5:2 E5:2 C5:4 |
            E5:4 D5:2 C5:2 G4:8 | A4:4 C5:4 F5:4 E5:4 | D5:4 G5:4 F5:2 E5:2 D5:4 | C5:12 r:4`,
    },
  },
  BATTLE_SONGS: ['son', 'ranchera', 'balada', 'huapango', 'vals'],
  TEMPO: 1.25, // más lento que antes: se oye la melodía y no cansa
  // Acompañamiento por estilo: paso del compás → golpes. B raíz, F quinta, O octava,
  // X raíz/quinta alternando por compás, S rasgueo, P colchón, A arpegio,
  // K bombo, k bombo suave, N tarola, G tarola ochentera, C palmas, H hat abierto, h hat, z zapateado.
  STYLES: {
    polka: [{ 0: 'B k', 2: 'S h', 4: 'F k', 6: 'S h' }],
    son: [{ 0: 'B z', 2: 'S', 4: 'S', 6: 'F z', 8: 'S', 10: 'S' }, { 0: 'B z', 4: 'F S', 8: 'B S' }],
    disco: [{ 0: 'B K A', 1: 'h', 2: 'O H A', 3: 'h', 4: 'B K C A', 5: 'h', 6: 'O H A', 7: 'h', 8: 'B K A', 9: 'h', 10: 'O H A', 11: 'h', 12: 'B K C A', 13: 'h', 14: 'O H A', 15: 'h' }],
    ballad: [{ 0: 'B K P h', 2: 'B h', 4: 'B G h', 6: 'B h', 8: 'B h', 10: 'B K h', 12: 'B G h', 14: 'B h' }],
    huapango: [{ 0: 'B S z', 3: 'S', 6: 'F S z', 8: 'S', 10: 'S z' }],
    waltz: [{ 0: 'X', 4: 'S h', 8: 'S h' }],
    march: [{ 0: 'B K', 4: 'S h', 8: 'F K', 12: 'S h', 14: 'N' }],
  },
  KEYS: { G: [7, 'maj'], D: [2, 'maj'], F: [5, 'maj'], A: [9, 'maj'], C: [0, 'maj'], Am: [9, 'min'] },
  midi(nm) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(nm);
    if (!m) throw new Error('nota inválida ' + nm);
    return ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  },
  chordOf(sym) {
    const m = /^([A-G])(#|b)?(maj7|m7|m|7|dim)?$/.exec(sym);
    if (!m) throw new Error('acorde inválido ' + sym);
    const root = (this.midi(m[1] + (m[2] || '') + '4') + 120) % 12;
    const iv = ({ '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dim: [0, 3, 6] })[m[3] || ''];
    return { root, pcs: iv.map(x => (root + x) % 12) };
  },
  // Segunda trompeta: una tercera abajo (o cuarta si la tercera no es del acorde).
  harmOf(n, ch, key, dur) {
    if (dur >= 2) for (const iv of [3, 4, 5]) if (ch.pcs.includes((n - iv + 120) % 12)) return n - iv;
    const [kr, mode] = this.KEYS[key];
    const sc = (mode === 'min' ? [0, 2, 3, 5, 7, 8, 11] : [0, 2, 4, 5, 7, 9, 11]).map(x => (x + kr) % 12);
    const i = sc.indexOf(n % 12);
    if (i < 0) return n - 3;
    return n - ((sc[i] - sc[(i + 5) % 7] + 12) % 12);
  },
  compile(name) {
    const d = this.SONGS[name], L = d.bar;
    const bars = d.mel.split('|').map(s => s.trim()).filter(Boolean);
    const chords = d.chords.split(/[\s|]+/).filter(Boolean).map(c => c.split('/').map(x => this.chordOf(x)));
    const len = bars.length * L, ev = Array.from({ length: len }, () => []), bad = [];
    const style = this.STYLES[d.style];
    bars.forEach((txt, b) => {
      const ch = chords[b % chords.length], split = ch.length > 1;
      const chAt = st => ch[split && st >= L / 2 ? 1 : 0];
      const sec = Object.assign({ lead: d.lead, harm: !!d.harm }, (d.secs || []).find(x => b >= x.from && b < x.to) || {});
      let s = 0;
      for (const tok of txt.split(/\s+/)) {
        const [nm, du] = tok.split(':'), dur = +du || 1;
        if (nm !== 'r' && s < L) {
          const n = this.midi(nm), e = ev[b * L + s];
          e.push({ v: sec.lead, n, d: dur });
          if (sec.harm) e.push({ v: sec.lead, n: this.harmOf(n, chAt(s), d.key, dur), d: dur, h: 1 });
        }
        s += dur;
      }
      if (s !== L) bad.push(`compás ${b + 1}: ${s}/${L}`);
      const pat = style[b % style.length];
      for (const k in pat) {
        const st = +k, c = chAt(st), e = ev[b * L + st];
        const bass = pc => 40 + ((pc - 40 % 12 + 12) % 12);
        for (const code of pat[k].split(' ')) {
          if (code === 'B' || (code === 'X' && b % 2 === 0)) e.push({ v: 'bass', n: bass(c.root), d: 2 });
          else if (code === 'F' || code === 'X') e.push({ v: 'bass', n: bass(c.root + 7), d: 2 });
          else if (code === 'O') e.push({ v: 'bass', n: bass(c.root) + 12, d: 1 });
          else if (code === 'S') e.push({ v: 'strum', ch: c });
          else if (code === 'P') {
            e.push({ v: 'pad', ch: ch[0], d: split ? L / 2 : L });
            if (split) ev[b * L + L / 2].push({ v: 'pad', ch: ch[1], d: L / 2 });
          } else if (code === 'A') e.push({ v: 'arp', n: 60 + ((c.pcs[(st / 2) % c.pcs.length] - 0 + 12) % 12) + (st % 8 >= 4 ? 12 : 0), d: 1 });
          else e.push({ v: 'drum', k: code });
        }
      }
    });
    const passes = d.loopFrom ? Infinity : Math.max(2, Math.ceil(70 / (len * d.sp * this.TEMPO)));
    return { name, def: d, ev, len, sp: d.sp * this.TEMPO, bad, pass: 0, passes, tr: 0 };
  },
  pulse(duty) {
    if (this._pwCtx !== this.ctx) { this._pw = {}; this._pwCtx = this.ctx; }
    if (!this._pw[duty]) {
      const n = 40, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = 2 / (k * Math.PI) * Math.sin(Math.PI * k * duty);
      this._pw[duty] = this.ctx.createPeriodicWave(re, im);
    }
    return this._pw[duty];
  },
  musBus() {
    if (this._bus && this._bus.ctx === this.ctx) return this._bus;
    const c = this.ctx, lp = c.createBiquadFilter(), shelf = c.createBiquadFilter();
    const sg = c.createGain(); sg.connect(this.musGain);
    // sin chirrido: pasa bajas suave y un poco menos de agudos
    lp.type = 'lowpass'; lp.frequency.value = 4600; lp.Q.value = 0.5;
    shelf.type = 'highshelf'; shelf.frequency.value = 3200; shelf.gain.value = -4;
    lp.connect(shelf); shelf.connect(sg);
    // eco para la balada
    const send = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
    dl.delayTime.value = 0.3; fb.gain.value = 0.28; wet.gain.value = 0.4;
    send.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(lp);
    // sala: reverberación sintética (ruido que se apaga), da aire y profundidad
    const rev = c.createGain(), conv = c.createConvolver(), rwet = c.createGain();
    conv.buffer = this.irBuffer(2.4); rwet.gain.value = 0.55;
    rev.connect(conv); conv.connect(rwet); rwet.connect(shelf);
    return (this._bus = { ctx: c, input: lp, send, rev, delay: dl, song: sg });
  },
  irBuffer(secs) {
    if (this._ir && this._ir.ctx === this.ctx) return this._ir.buf;
    const c = this.ctx, n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) { const k = i / n; lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = lp * Math.pow(1 - k, 3.2) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1); }
    }
    this._ir = { ctx: c, buf: b };
    return b;
  },
  // Una voz de sintetizador: osciladores levemente desafinados → filtro con envolvente → volumen.
  syn(f, t, dur, vol, o = {}) {
    const c = this.ctx, bus = o.bus || this.musBus(); // o.bus: los efectos usan su propio canal
    const g = c.createGain(), flt = c.createBiquadFilter();
    const att = o.att || 0.01, dec = o.dec || 0.1, sus = o.sus ?? 0.7, rel = o.rel || 0.08;
    dur = Math.max(dur, att + dec + 0.01);
    flt.type = 'lowpass'; flt.Q.value = o.q || 0.7;
    const cut = Math.min(f * (o.cutK || 4), o.cut || 2400), peak = o.cutPeak ? Math.min(cut * o.cutPeak, 9000) : cut;
    flt.frequency.setValueAtTime(peak, t);
    if (o.cutPeak) flt.frequency.exponentialRampToValueAtTime(Math.max(80, cut), t + (o.cutT || 0.18));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.linearRampToValueAtTime(vol * sus, t + att + dec);
    g.gain.setValueAtTime(vol * sus, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    const oscs = [];
    for (const [type, cents, mul] of (o.waves || [['sawtooth', -6, 0.5], ['sawtooth', 6, 0.5]])) {
      const osc = c.createOscillator(), og = c.createGain();
      osc.type = type; osc.detune.value = cents || 0;
      if (o.scoop) { osc.frequency.setValueAtTime(f * (1 - o.scoop), t); osc.frequency.linearRampToValueAtTime(f, t + 0.06); } else osc.frequency.setValueAtTime(f, t);
      og.gain.value = mul ?? 1; osc.connect(og); og.connect(flt); oscs.push(osc);
    }
    flt.connect(g); g.connect(bus.input);
    if (o.echo && bus.send) { const s = c.createGain(); s.gain.value = o.echo; g.connect(s); s.connect(bus.send); }
    if (o.rev && bus.rev) { const s = c.createGain(); s.gain.value = o.rev; g.connect(s); s.connect(bus.rev); }
    if (o.vib && dur > 0.25) {
      const lfo = c.createOscillator(), lg = c.createGain(), d0 = t + Math.min(0.22, dur * 0.4);
      lfo.frequency.value = o.vibRate || 5.2; lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, d0);
      lg.gain.linearRampToValueAtTime(o.vib * 1200, d0 + 0.25);
      lfo.connect(lg); for (const osc of oscs) lg.connect(osc.detune); lfo.start(t); lfo.stop(t + dur + rel + 0.05);
    }
    for (const osc of oscs) { osc.start(t); osc.stop(t + dur + rel + 0.05); }
  },
  // compatibilidad: el nombre viejo sigue sirviendo
  note(wave, f, t, dur, vol, o = {}) { this.syn(f, t, dur, vol, Object.assign({ waves: [[typeof wave === 'number' ? 'triangle' : wave, 0, 1]] }, o)); },
  voice(e, when, sp, tr) {
    const t = this.ctx.currentTime + when, hz = n => 440 * Math.pow(2, (n + tr - 69) / 12);
    const mg = this.musBus().input, dur = (e.d || 1) * sp, h = !!e.h;
    switch (e.v) {
      // metales suaves: dos sierras desafinadas con el filtro que abre al atacar
      case 'trumpet': this.syn(hz(e.n), t, dur * 0.92, h ? 0.05 : 0.085, { cut: 2200, cutK: 3.2, cutPeak: 1.8, cutT: 0.14, att: 0.025, dec: 0.12, sus: 0.72, rel: 0.12, scoop: h ? 0 : 0.02, vib: 0.009, rev: 0.28 }); break;
      // cuerdas: arco lento, conjunto de tres
      case 'violin': this.syn(hz(e.n), t, dur * 0.97, h ? 0.045 : 0.075, { waves: [['sawtooth', -8, 0.4], ['sawtooth', 0, 0.35], ['sawtooth', 9, 0.4]], cut: 2400, cutK: 3.6, att: 0.07, dec: 0.15, sus: 0.85, rel: 0.2, vib: 0.011, rev: 0.4 }); break;
      // voz de balada: seno y triángulo, redonda, con mucha sala
      case 'voice': this.syn(hz(e.n), t, dur * 0.95, h ? 0.05 : 0.11, { waves: [['triangle', 0, 0.7], ['sine', 4, 0.5]], cut: 1800, att: 0.05, dec: 0.25, sus: 0.75, rel: 0.25, vib: 0.013, echo: 0.3, rev: 0.5, scoop: h ? 0 : 0.015 }); break;
      // guitarrón: seno + triángulo con el filtro cerrado
      case 'bass': this.syn(hz(e.n), t, dur * 0.8, 0.28, { waves: [['sine', 0, 0.8], ['triangle', 0, 0.45]], cut: 700, att: 0.006, dec: 0.14, sus: 0.55, rel: 0.08 }); break;
      case 'arp': this.syn(hz(e.n), t, dur * 0.6, 0.03, { waves: [['triangle', 0, 1]], cut: 2600, att: 0.004, dec: 0.08, sus: 0.3, rel: 0.12, rev: 0.35 }); break;
      // guitarra: cuerda pulsada, el filtro se cierra rápido
      case 'strum': {
        const ns = [];
        for (const pc of e.ch.pcs) ns.push(57 + ((pc - 57 % 12 + 12) % 12));
        ns.sort((a, b) => a - b).forEach((n, i) => this.syn(hz(n), t + i * 0.014, sp * 0.9, 0.032, { waves: [['sawtooth', 0, 0.6], ['triangle', 0, 0.6]], cut: 520, cutK: 9, cutPeak: 5, cutT: 0.12, att: 0.003, dec: 0.12, sus: 0.25, rel: 0.1, rev: 0.2 }));
        break;
      }
      case 'pad': for (const pc of e.ch.pcs) this.syn(hz(55 + ((pc - 55 % 12 + 12) % 12)), t, dur * 0.98, 0.02, { cut: 1100, att: 0.35, dec: 0.4, sus: 0.85, rel: 0.5, rev: 0.6 }); break;
      case 'drum': {
        const rev = this.musBus().rev;
        const wet = amt => { const g = this.ctx.createGain(); g.gain.value = amt; g.connect(rev); return g; };
        switch (e.k) {
          case 'K': this.tone('sine', 110, 42, 0.18, 0.5, when, mg); this.noise(0.012, 0.08, 3000, 0.8, when, 'bandpass', mg); break;
          case 'k': this.tone('sine', 100, 45, 0.12, 0.28, when, mg); break;
          case 'N': this.noise(0.12, 0.16, 1900, 0.8, when, 'bandpass', mg); this.noise(0.14, 0.08, 1900, 0.8, when, 'bandpass', wet(0.5)); this.tone('triangle', 190, 160, 0.06, 0.12, when, mg); break;
          case 'G': this.noise(0.18, 0.15, 1500, 0.7, when, 'bandpass', mg); this.noise(0.25, 0.1, 1500, 0.7, when, 'bandpass', wet(0.6)); break;
          case 'C': for (let i = 0; i < 3; i++) this.noise(0.03 + i * 0.02, 0.1, 1400, 1.1, when + i * 0.011, 'bandpass', i === 2 ? wet(0.5) : mg); break;
          case 'H': this.noise(0.08, 0.04, 8000, 0.8, when, 'highpass', mg); break;
          case 'h': this.noise(0.02, 0.03, 9000, 0.8, when, 'highpass', mg); break;
          case 'z': this.noise(0.03, 0.07, 2600, 1.2, when, 'bandpass', mg); break;
        }
        break;
      }
    }
  },
  // "¡Ajúa!": deslizamiento hacia arriba con vibrato y caída, ahora con voz suave y sala
  grito(when) {
    const c = this.ctx, t = c.currentTime + when, bus = this.musBus();
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), flt = c.createBiquadFilter();
    o.type = 'sawtooth'; flt.type = 'lowpass'; flt.frequency.value = 1800; flt.Q.value = 1.2;
    o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1050, t + 0.18);
    o.frequency.setValueAtTime(1050, t + 0.42); o.frequency.exponentialRampToValueAtTime(700, t + 0.72);
    lfo.frequency.value = 6.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(30, t + 0.25);
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.05);
    g.gain.setValueAtTime(0.07, t + 0.5); g.gain.linearRampToValueAtTime(0.0001, t + 0.75);
    o.connect(flt); flt.connect(g); g.connect(bus.input);
    const s = c.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(bus.rev);
    o.start(t); o.stop(t + 0.8); lfo.start(t); lfo.stop(t + 0.8);
  },
  playSong(name, opts = {}) {
    if (!opts.force && this.song && this.song.name === name) return;
    if (!this.SONGS[name]) { this.song = null; return; }
    this.song = Object.assign(this.compile(name), { shuffle: !!opts.shuffle });
    this.step = 0;
    if (!opts.keepTime) this.nextStep = this.ctx ? this.ctx.currentTime + 0.1 : 0;
    if (this.ctx) {
      const bus = this.musBus(), d = this.song.def, t = this.ctx.currentTime;
      bus.delay.delayTime.setValueAtTime(Math.min(0.9, d.echo ? d.echo * d.sp * this.TEMPO : 0.3), t);
      bus.song.gain.setValueAtTime(d.gain || 1, t);
    }
  },
  // Pelea: una canción al azar (nunca la misma que la anterior); al terminar sigue otra.
  playBattle(announce = true, keepTime = false) {
    const pool = this.BATTLE_SONGS.filter(n => n !== this.lastBattle);
    const name = pool[Math.floor(Math.random() * pool.length)];
    this.lastBattle = name;
    this.playSong(name, { shuffle: true, force: true, keepTime });
    if (announce) this.nowPlaying = { title: this.SONGS[name].title, t: performance.now() };
    return name;
  },
  stopSong() { this.song = null; },
  tick() {
    if (this.ctx) this.duckCheck();
    if (!this.ready || !this.song || !this.musicOn) return;
    if (this.nextStep < this.ctx.currentTime - 0.5) this.nextStep = this.ctx.currentTime + 0.05;
    while (this.song && this.nextStep < this.ctx.currentTime + 0.15) {
      const S = this.song;
      this.playStep(this.step, this.nextStep - this.ctx.currentTime, S.sp);
      this.nextStep += S.sp;
      if (++this.step >= S.len) this.endPass();
    }
  },
  endPass() {
    const S = this.song;
    S.pass++;
    if (S.shuffle && S.pass >= S.passes) { this.nextStep += S.sp * 4; this.playBattle(true, true); return; }
    this.step = S.def.loopFrom ? S.def.loopFrom * S.def.bar : 0;
    // la última vuelta sube de tono, como en las baladas de antes
    S.tr = S.shuffle && S.passes > 1 && S.pass === S.passes - 1 ? (S.def.up || 1) : 0;
  },
  playStep(i, when, sp) {
    const S = this.song;
    for (const e of S.ev[i]) this.voice(e, when, sp, S.tr);
    const L = S.def.bar;
    if (S.def.grito && S.pass % 3 === 0) for (const [b, st] of S.def.grito) if (i === b * L + st) this.grito(when);
  },
};

// Los navegadores solo dejan sonar después de un gesto: tecla, clic o SOLTAR el dedo (apoyarlo no cuenta).
// Los botones de un control de juego no cuentan: con control hace falta un clic, toque o tecla (ver el aviso del menú).
for (const ev of ['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend', 'click']) window.addEventListener(ev, () => Audio8.unlock(), { capture: true, passive: true });
