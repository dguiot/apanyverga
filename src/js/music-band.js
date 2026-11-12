'use strict';
// ============================================================
//  LA BANDA — banda sonora de los tres juegos
//  Antes cada tema eran senos y triángulos sueltos: sonaba a demo. Ahora toca una banda completa,
//  sintetizada al momento (sin archivos): batería con bombo, tarola, palmas, contratiempos, congas,
//  cencerro, güiro y platillos; bajo con filtro; piano eléctrico FM; colchón de cuerdas; metales con
//  ataque y vibrato; acordeón, marimba, flauta, guitarra y arpegios. Todo pasa por una sala (reverb),
//  eco estéreo, compresor y el "bombeo" del bombo sobre los acordes.
//  Cada tema conserva su armonía, su melodía y su tempo, pero ahora tiene estilo propio (cumbia, disco,
//  samba, synthwave, relajado) y forma de canción: entrada, verso, subida, coro, puente y cierre, con
//  remates de batería. La música sigue al juego: última vuelta más rápida, y más instrumentos cuando la
//  pelea o el tiroteo se ponen intensos.
//  El tema del menú no se toca.
// ============================================================
const Band = {
  // estilo por tema (los que no aparecen usan disco)
  STYLE: { temple: 'chill', volcano: 'samba', ship: 'cumbia', space: 'synth', city: 'funk', stadium: 'samba', xochi: 'cumbia', pyramid: 'chill', mercado: 'cumbia', volcan: 'samba', neon: 'synth', aurora: 'synth', sierra: 'funk', total: 'funk' },
  // ritmos de la melodía: pasos (semicorcheas) dentro de una frase de dos compases
  RHYTHM: {
    cumbia: [0, 3, 6, 8, 12, 14, 16, 19, 22, 24, 28], disco: [0, 4, 6, 8, 11, 14, 16, 20, 22, 24, 27], funk: [0, 3, 4, 6, 10, 12, 16, 19, 20, 22, 26, 28],
    samba: [0, 2, 4, 6, 8, 11, 14, 16, 18, 20, 22, 24, 27, 30], synth: [0, 6, 8, 12, 16, 22, 24, 28], chill: [0, 6, 8, 14, 16, 22, 24],
  },
  impulse(ctx) {
    // sala mediana: ruido que decae, más oscuro al final (determinista para que las pruebas se repitan)
    const sr = ctx.sampleRate, n = Math.floor(sr * 1.7), ch = Math.min(2, ctx.destination.channelCount || 2), b = ctx.createBuffer(Math.max(1, ch), n, sr);
    for (let c = 0; c < b.numberOfChannels; c++) {
      const a = b.getChannelData(c), rng = srand(4177 + c * 53); let lp = 0;
      for (let i = 0; i < n; i++) { const t = i / sr, k = .12 + .5 * Math.exp(-t * 3.2); lp += (rng() * 2 - 1 - lp) * k; a[i] = lp * Math.exp(-t * 3.4) * (i < sr * .012 ? i / (sr * .012) : 1); }
    }
    return b;
  },
  graph(ctx, destination) {
    // bus: salida final y entrada de los temas antiguos (menú). mix: la banda, antes del compresor.
    const bus = ctx.createGain(); bus.gain.value = .21; bus.connect(destination);
    const delay = ctx.createDelay(1), feedback = ctx.createGain(), wet = ctx.createGain(); delay.delayTime.value = .355; feedback.gain.value = .24; wet.gain.value = .16; delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(bus);
    const mix = ctx.createGain(), tone = ctx.createBiquadFilter(), comp = ctx.createDynamicsCompressor(), post = ctx.createGain();
    tone.type = 'lowpass'; tone.frequency.value = 19000; tone.Q.value = .4;
    comp.threshold.value = -11; comp.knee.value = 10; comp.ratio.value = 2.4; comp.attack.value = .012; comp.release.value = .16; post.gain.value = 1.05; mix.gain.value = .8;
    mix.connect(tone); tone.connect(comp); comp.connect(post); post.connect(bus);
    const drums = ctx.createGain(), duck = ctx.createGain(); drums.connect(mix); duck.connect(mix);
    const rev = ctx.createGain(), conv = ctx.createConvolver(), revOut = ctx.createGain(); conv.buffer = this.impulse(ctx); revOut.gain.value = .5; rev.connect(conv); conv.connect(revOut); revOut.connect(mix);
    // eco estéreo: rebota de un lado al otro
    const echo = ctx.createGain(), dl = ctx.createDelay(1.5), dr = ctx.createDelay(1.5), fb = ctx.createGain(), echoOut = ctx.createGain(); fb.gain.value = .32; echoOut.gain.value = .5;
    echo.connect(dl); dl.connect(dr); dr.connect(fb); fb.connect(dl);
    if (ctx.createStereoPanner) { const pl = ctx.createStereoPanner(), pr = ctx.createStereoPanner(); pl.pan.value = -.7; pr.pan.value = .7; dl.connect(pl); dr.connect(pr); pl.connect(echoOut); pr.connect(echoOut); } else { dl.connect(echoOut); dr.connect(echoOut); }
    echoOut.connect(mix);
    return { bus, delay, mix, tone, drums, duck, rev, echo, dl, dr, band: true };
  },
  // ---------- instrumentos ----------
  kit(ctx, g) {
    const noise = KartMusic.noise(ctx), hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const send = (node, dest, rev = 0, echo = 0, pan = 0) => {
      let n = node; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
      n.connect(dest);
      if (rev) { const s = ctx.createGain(); s.gain.value = rev; n.connect(s); s.connect(g.rev); }
      if (echo) { const s = ctx.createGain(); s.gain.value = echo; n.connect(s); s.connect(g.echo); }
    };
    const amp = (t, a, peak, d) => { const v = ctx.createGain(); v.gain.setValueAtTime(.0001, t); v.gain.linearRampToValueAtTime(Math.max(.0002, peak), t + a); v.gain.exponentialRampToValueAtTime(.0001, t + a + d); return v; };
    // sostenida: sube, se mantiene y suelta
    const hold = (t, a, peak, dur, rel) => { const v = ctx.createGain(); v.gain.setValueAtTime(.0001, t); v.gain.linearRampToValueAtTime(Math.max(.0002, peak), t + a); v.gain.setValueAtTime(Math.max(.0002, peak * .82), t + Math.max(a, dur)); v.gain.exponentialRampToValueAtTime(.0001, t + Math.max(a, dur) + rel); return v; };
    const osc = (type, f, t, len, detune = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.start(t); o.stop(t + len + .06); return o; };
    const nz = (t, len, type, f, q = .7) => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(); s.buffer = noise; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); s.start(t, (t * 7.13) % .8); s.stop(t + len + .04); return fl; };
    const lp = (f0, q = .7) => { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f0; fl.Q.value = q; return fl; };
    const vib = (t, len, f, depth, after = .16, rate = 5.6) => { const l = osc('sine', rate, t, len), d = ctx.createGain(); d.gain.setValueAtTime(0, t); d.gain.setValueAtTime(0, t + after); d.gain.linearRampToValueAtTime(f * depth, t + after + .12); l.connect(d); return d; };
    const K = {
      tempo(bpm, t) { const beat = 60 / bpm; g.dl.delayTime.setValueAtTime(beat * .75, t); g.dr.delayTime.setValueAtTime(beat * .5, t); },
      kick(t, v = 1) {
        const o = osc('sine', 155, t, .34); o.frequency.exponentialRampToValueAtTime(46, t + .1); const a = amp(t, .002, .62 * v, .26); o.connect(a); a.connect(g.drums);
        const c = nz(t, .014, 'highpass', 2400), ca = amp(t, .001, .3 * v, .013); c.connect(ca); ca.connect(g.drums);
        // bombeo: los acordes y el bajo se agachan con cada bombo
        g.duck.gain.setValueAtTime(1 - .5 * Math.min(1, v), t); g.duck.gain.linearRampToValueAtTime(1, t + .2);
      },
      snare(t, v = 1) {
        const o = osc('triangle', 205, t, .12); o.frequency.exponentialRampToValueAtTime(140, t + .08); const a = amp(t, .001, .36 * v, .1); o.connect(a); a.connect(g.drums);
        const n = nz(t, .2, 'bandpass', 1850, .5), na = amp(t, .001, .62 * v, .17); n.connect(na); send(na, g.drums, .2);
        const h = nz(t, .1, 'highpass', 5200), ha = amp(t, .001, .2 * v, .08); h.connect(ha); ha.connect(g.drums);
      },
      clap(t, v = 1) {
        for (const k of [0, .011, .023]) { const n = nz(t + k, .02, 'bandpass', 1400, 1.1), a = amp(t + k, .001, .4 * v, .017); n.connect(a); a.connect(g.drums); }
        const n = nz(t + .03, .15, 'bandpass', 1500, .8), a = amp(t + .03, .001, .36 * v, .13); n.connect(a); send(a, g.drums, .28);
      },
      hat(t, v = 1, open = false) { const n = nz(t, open ? .3 : .045, 'highpass', 7800), a = amp(t, .001, .33 * v, open ? .26 : .036); n.connect(a); send(a, g.drums, 0, 0, .22); },
      shaker(t, v = 1) { const n = nz(t, .08, 'bandpass', 5600, 1.4), a = amp(t, .014, .17 * v, .05); n.connect(a); send(a, g.drums, 0, 0, -.32); },
      conga(t, v = 1, f = 210, slap = false) {
        const o = osc('sine', f * 1.5, t, .22); o.frequency.exponentialRampToValueAtTime(f, t + .03); const a = amp(t, .002, .4 * v, slap ? .07 : .17); o.connect(a); send(a, g.drums, .14, 0, .34);
        if (slap) { const n = nz(t, .04, 'bandpass', 2600, 1), na = amp(t, .001, .18 * v, .03); n.connect(na); send(na, g.drums, .1, 0, .34); }
      },
      cowbell(t, v = 1) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2.4; for (const q of [562, 845]) osc('square', q, t, .16).connect(f); const a = amp(t, .001, .16 * v, .13); f.connect(a); send(a, g.drums, .1, 0, -.26); },
      guiro(t, v = 1, long = false) {
        const n = nz(t, long ? .2 : .08, 'bandpass', 3600, 2), a = ctx.createGain(), count = long ? 11 : 4; a.gain.setValueAtTime(.0001, t);
        for (let i = 0; i < count; i++) { a.gain.setValueAtTime(.13 * v * (1 - i / count * .45), t + i * .016); a.gain.setValueAtTime(.012, t + i * .016 + .008); }
        a.gain.setValueAtTime(.0001, t + count * .016 + .01); n.connect(a); send(a, g.drums, .06, 0, .42);
      },
      tom(t, v = 1, f = 130) { const o = osc('sine', f * 1.35, t, .3); o.frequency.exponentialRampToValueAtTime(f * .8, t + .13); const a = amp(t, .002, .36 * v, .24); o.connect(a); send(a, g.drums, .2, 0, (f - 120) / 180); },
      crash(t, v = 1) { const n = nz(t, 1.5, 'highpass', 3800), a = amp(t, .002, .24 * v, 1.35); n.connect(a); send(a, g.drums, .45); },
      riser(t, len, v = 1) {
        const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), a = ctx.createGain(); s.buffer = noise; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 1.1; fl.frequency.setValueAtTime(420, t); fl.frequency.exponentialRampToValueAtTime(7200, t + len);
        a.gain.setValueAtTime(.0001, t); a.gain.linearRampToValueAtTime(.17 * v, t + len); a.gain.linearRampToValueAtTime(.0001, t + len + .05); s.connect(fl); fl.connect(a); send(a, g.mix, .3); s.start(t); s.stop(t + len + .1);
      },
      impact(t, v = 1) { const o = osc('sine', 82, t, .8); o.frequency.exponentialRampToValueAtTime(34, t + .6); const a = amp(t, .004, .3 * v, .7); o.connect(a); a.connect(g.drums); },
      bass(t, m, len, v = 1, synth = false) {
        const f = hz(m), fl = lp(synth ? 1100 : 620, synth ? 5 : 1.6), a = hold(t, .008, (synth ? .2 : .2) * v, len * .8, len * .25 + .03);
        fl.frequency.setValueAtTime((synth ? 1500 : 760) * (.6 + .4 * v), t); fl.frequency.exponentialRampToValueAtTime(synth ? 320 : 230, t + Math.max(.08, len * .8));
        if (synth) { osc('sawtooth', f, t, len + .1).connect(fl); const sq = ctx.createGain(); sq.gain.value = .5; osc('square', f, t, len + .1, 7).connect(sq); sq.connect(fl); }
        else { osc('triangle', f, t, len + .1).connect(fl); const sw = ctx.createGain(); sw.gain.value = .5; osc('sawtooth', f, t, len + .1).connect(sw); sw.connect(fl); }
        const sub = ctx.createGain(); sub.gain.value = .4; osc('sine', f, t, len + .1).connect(sub); sub.connect(a); fl.connect(a); a.connect(g.duck);
      },
      // piano eléctrico: FM de dos operadores (campana al atacar, cuerpo cálido)
      epiano(t, m, len, v = 1, pan = 0) {
        const f = hz(m), car = osc('sine', f, t, len + .3), tine = osc('sine', f * 14, t, .2), body = osc('sine', f, t, len + .3);
        const ti = ctx.createGain(); ti.gain.setValueAtTime(f * 1.6 * v, t); ti.gain.exponentialRampToValueAtTime(.01, t + .09); tine.connect(ti); ti.connect(car.frequency);
        const bi = ctx.createGain(); bi.gain.setValueAtTime(f * .85, t); bi.gain.exponentialRampToValueAtTime(f * .2, t + len); body.connect(bi); bi.connect(car.frequency);
        const a = amp(t, .004, .24 * v, len * 1.1 + .1); car.connect(a); send(a, g.duck, .22, .1, pan);
      },
      pad(t, notes, len, v = 1) {
        notes.forEach((m, i) => { const f = hz(m), fl = lp(650, .5), a = hold(t, Math.min(.55, len * .3), .06 * v, len, .6); fl.frequency.linearRampToValueAtTime(1500, t + len * .6); osc('sawtooth', f, t, len + .7, -8).connect(fl); osc('sawtooth', f, t, len + .7, 8).connect(fl); fl.connect(a); send(a, g.duck, .45, 0, (i % 2 ? .5 : -.5)); });
      },
      brass(t, m, len, v = 1, pan = 0) {
        const f = hz(m), fl = lp(420, 1.2), a = hold(t, .026, .15 * v, len, .09), vb = vib(t, len + .2, f, .0055);
        fl.frequency.linearRampToValueAtTime(2500 * (.6 + .4 * v), t + .055); fl.frequency.exponentialRampToValueAtTime(1500, t + Math.max(.1, len));
        for (const dt of [-7, 0, 7]) { const o = osc('sawtooth', f * .972, t, len + .2, dt); o.frequency.exponentialRampToValueAtTime(f, t + .045); vb.connect(o.frequency); o.connect(fl); }
        fl.connect(a); send(a, g.mix, .3, .1, pan);
      },
      reed(t, m, len, v = 1) {
        const f = hz(m), fl = lp(2300, .8), a = hold(t, .02, .1 * v, len, .07), trem = vib(t, len + .2, 1, .0001);
        osc('square', f, t, len + .15, -9).connect(fl); osc('square', f, t, len + .15, 9).connect(fl); const up = ctx.createGain(); up.gain.value = .3; osc('square', f * 2, t, len + .15).connect(up); up.connect(fl); trem.connect(a.gain);
        fl.connect(a); send(a, g.mix, .2, .08, -.15);
      },
      marimba(t, m, len, v = 1, pan = 0) {
        const f = hz(m), a = amp(t, .002, .4 * v, Math.max(.2, len)), h = amp(t, .001, .14 * v, .06), c = amp(t, .001, .05 * v, .02);
        osc('sine', f, t, len + .3).connect(a); osc('sine', f * 4, t, .12).connect(h); osc('sine', f * 10, t, .06).connect(c);
        const sum = ctx.createGain(); a.connect(sum); h.connect(sum); c.connect(sum); send(sum, g.mix, .3, .14, pan);
      },
      pluck(t, m, len, v = 1, pan = -.35) { const f = hz(m), fl = lp(3200, 3), a = amp(t, .002, .17 * v, len); fl.frequency.exponentialRampToValueAtTime(520, t + .09); osc('sawtooth', f, t, len + .1).connect(fl); fl.connect(a); send(a, g.duck, .12, 0, pan); },
      lead(t, m, len, v = 1) {
        const f = hz(m), fl = lp(900, 2), a = hold(t, .012, .11 * v, len, .1), vb = vib(t, len + .2, f, .005, .12);
        fl.frequency.linearRampToValueAtTime(2800, t + .04); fl.frequency.exponentialRampToValueAtTime(1500, t + Math.max(.08, len));
        for (const [type, dt, gain] of [['sawtooth', -6, 1], ['square', 6, .55]]) { const o = osc(type, f, t, len + .2, dt), og = ctx.createGain(); og.gain.value = gain; vb.connect(o.frequency); o.connect(og); og.connect(fl); }
        fl.connect(a); send(a, g.mix, .2, .3);
      },
      flute(t, m, len, v = 1) {
        const f = hz(m), a = hold(t, .05, .2 * v, len, .12), vb = vib(t, len + .2, f, .006, .1, 5), o = osc('sine', f, t, len + .2), o2 = osc('sine', f * 2, t, len + .2), g2 = ctx.createGain(); g2.gain.value = .22;
        vb.connect(o.frequency); o.connect(a); o2.connect(g2); g2.connect(a); const br = nz(t, len + .1, 'bandpass', f * 2, 1.5), bg = ctx.createGain(); bg.gain.value = .035; br.connect(bg); bg.connect(a); send(a, g.mix, .4, .22);
      },
      arp(t, m, v = 1, pan = 0) { const f = hz(m), fl = lp(2200, 2.4), a = amp(t, .002, .1 * v, .13); fl.frequency.exponentialRampToValueAtTime(600, t + .1); osc('square', f, t, .2).connect(fl); fl.connect(a); send(a, g.duck, .15, .34, pan); },
    };
    return K;
  },
  // nota de acorde más cercana (en cualquier octava)
  snap(n, chord) { let best = n, gap = 99; for (const c of chord) for (let o = -24; o <= 24; o += 12) { const d = Math.abs(c + o - n); if (d < gap) { gap = d; best = c + o; } } return best; },
  below(n, chord) { let best = n - 4; for (const c of chord) for (let o = -24; o <= 24; o += 12) { const q = c + o; if (q <= n - 3 && q >= n - 9 && (best > n - 3 || q > best)) best = q; } return best; },
  schedule(ctx, g, index, time, mood) {
    const d = STAGE_SCORE[mood], K = g.kit || (g.kit = this.kit(ctx, g)); if (g.bandMood !== mood) { g.bandMood = mood; K.tempo(d.bpm, time); }
    const style = this.STYLE[mood] || 'disco', sp = 60 / d.bpm / 4, step = index % 16, bar = Math.floor(index / 16), ph = bar % 32, sec = Math.floor(bar / 2) % 4, chord = d.chords[sec].map(n => n + d.key), t = time + (step % 2 ? sp * d.swing : 0);
    const part = ph < 4 ? 'intro' : ph < 12 ? 'verse' : ph < 16 ? 'pre' : ph < 24 ? 'chorus' : ph < 28 ? 'break' : 'outro', full = part === 'chorus' || part === 'outro', quiet = part === 'intro' || part === 'break';
    // intensidad del juego (0–1): solo en vivo; las pruebas y vistas previas tocan la canción completa
    const heat = g.live ? KartMusic.heat : 1, E = d.energy * (quiet ? .75 : 1), beat = step % 4 === 0;
    const fillBar = ph % 8 === 7, bigFill = ph === 15 || ph === 31, fill = fillBar && step >= (bigFill ? 8 : 12);
    // ----- batería -----
    if (fill) {
      const k = step - (bigFill ? 8 : 12), n = bigFill ? 8 : 4;
      if (bigFill) { if (step % 2 === 0 || step >= 12) K.tom(t, .5 + k / n * .4, [185, 185, 160, 160, 135, 135, 110, 96][k]); if (step >= 12) K.snare(t, .35 + (step - 12) * .14); }
      else K.snare(t, .3 + k * .16);
      if (step === 8 || step === 12) K.kick(t, .8);
    } else if (style === 'cumbia') {
      if (step === 0 || step === 8) K.kick(t, .9); else if (full && (step === 6 || step === 14)) K.kick(t, .5);
      if (!quiet && (step === 4 || step === 12)) K.snare(t, .5 * E); if (full && (step === 4 || step === 12)) K.clap(t, .5);
      if (beat) K.guiro(t, .9, true); else if (step % 4 >= 2) K.guiro(t, .7);
      if (part !== 'intro') { if (step === 2 || step === 10) K.conga(t, .7, 225); if (step === 6 || step === 14 || step === 15) K.conga(t, .6, 170); if (step === 4 || step === 12) K.conga(t, .5, 260, true); }
      if (full && heat > .4 && [0, 4, 8, 12, 14].includes(step)) K.cowbell(t, step === 14 ? .5 : .75);
      if (full && step % 4 === 2) K.hat(t, .7, true);
    } else if (style === 'samba') {
      if (beat && part !== 'break') K.kick(t, .92); else if (part === 'break' && step === 0) K.kick(t, .8);
      if (!quiet && (step === 4 || step === 12)) { K.snare(t, .75 * E); if (full) K.clap(t, .5); }
      if (!quiet && [3, 7, 10, 15].includes(step)) K.snare(t, .16);
      if ([0, 3, 6, 10, 12].includes(step) && part !== 'intro' && heat > .3) K.cowbell(t, .8);
      K.shaker(t, step % 2 ? .55 : .9); if (step % 4 === 2) K.hat(t, .8, full);
      if (step === 4 || step === 12) K.tom(t, .4, 95); if (full && (step === 7 || step === 15)) K.conga(t, .55, 240, true);
    } else if (style === 'synth') {
      if (beat && part !== 'break') K.kick(t, .95); else if (part === 'break' && step === 0) K.kick(t, .7);
      if (!quiet && (step === 4 || step === 12)) { K.snare(t, .85 * E); K.clap(t, .45); }
      if (step % 4 === 2) K.hat(t, .8, full && step === 14); else if (step % 2 === 1 && !quiet) K.hat(t, .3);
      if (full && heat > .5) K.shaker(t, step % 2 ? .4 : .7);
    } else if (style === 'chill') {
      if (step === 0 || (step === 10 && !quiet)) K.kick(t, .8); if (step === 8 && !quiet) { K.snare(t, .55 * E); if (full) K.clap(t, .35); }
      if (step % 2 === 0) K.shaker(t, beat ? .85 : .5); if (full && step % 4 === 2) K.hat(t, .5);
      if (part !== 'intro' && [3, 6, 11, 14].includes(step)) K.conga(t, .5, step === 6 || step === 14 ? 180 : 230);
    } else { // disco / funk
      if (beat && (part !== 'break' || step === 0 || step === 8)) K.kick(t, .92);
      if (!quiet && (step === 4 || step === 12)) { K.snare(t, .6 * E); K.clap(t, .6 * E); }
      if (step % 4 === 2) K.hat(t, .9, part !== 'intro'); else if (step % 2 === 1 && !quiet) K.hat(t, .28); else if (beat) K.hat(t, .4);
      if (style === 'funk' && !quiet && [7, 9, 15].includes(step)) K.snare(t, .14);
      if (full && heat > .5) { K.shaker(t, step % 2 ? .4 : .75); if ([2, 10].includes(step)) K.conga(t, .5, 230); if ([6, 14].includes(step)) K.conga(t, .45, 180); }
    }
    if (step === 0 && (ph === 4 || ph === 16 || ph === 28 || (ph === 0 && bar > 0))) { K.crash(t, ph === 16 ? .9 : .6); if (ph === 16) K.impact(t, .8); }
    if (step === 0 && (ph === 15 || ph === 3 || ph === 27)) K.riser(t, sp * 16, ph === 15 ? 1 : .6);
    // ----- bajo -----
    const root = chord[0] - 12, fifth = this.snap(root + 7, chord.map(n => n - 12)), synth = style === 'synth' || style === 'funk';
    if (!(part === 'break' && style !== 'chill' && step !== 0)) {
      if (style === 'cumbia') { const n = { 0: root, 6: fifth, 8: root, 12: fifth, 14: root + 12 }[step]; if (n !== undefined && (part !== 'intro' || step < 9)) K.bass(t + .006, n, sp * (step === 0 ? 3.4 : 1.7), step === 0 ? 1 : .8); }
      else if (style === 'samba') { const n = { 0: root, 3: root, 6: fifth, 8: root, 11: root + 12, 14: fifth }[step]; if (n !== undefined) K.bass(t + .006, n, sp * (step % 8 === 0 ? 2.4 : 1.4), step % 8 === 0 ? 1 : .78); }
      else if (style === 'synth') { if (step % 2 === 0) K.bass(t + .004, root + (step % 4 === 2 ? 12 : 0), sp * 1.7, beat ? .9 : .72, true); }
      else if (style === 'chill') { const n = { 0: root, 7: fifth, 10: root }[step]; if (n !== undefined) K.bass(t + .006, n, sp * (step === 0 ? 6 : 2.5), step === 0 ? .95 : .7); }
      else if (d.bass.includes(step)) { const n = root + (step === 7 || step === 15 ? 12 : step === 11 ? 7 : 0), accent = step === 0 || step === 8; K.bass(t + .006, n, sp * (accent ? 2.4 : 1.3), accent ? 1 : .78, synth); }
    }
    // ----- acordes -----
    if (step === 0 && bar % 2 === 0) K.pad(t, chord.map(n => n + (style === 'synth' ? 12 : 0)), sp * 31, quiet ? 1.25 : full ? 1.1 : .8);
    if (style === 'cumbia') { if (part !== 'intro' && step % 4 === 2) chord.slice(1).forEach((n, i) => K.pluck(t + i * .012, n + 12, sp * 1.2, .8, -.3 + i * .1)); if (full && step % 4 === 3) chord.slice(1).forEach((n, i) => K.pluck(t + (2 - i) * .01, n + 12, sp * .7, .5, -.3 + i * .1)); }
    else if (style === 'synth') { if (part !== 'intro' || bar % 4 >= 2) { const seq = [0, 1, 2, 3, 2, 1, 2, 3], n = chord[seq[step % 8]] + 12 + (step >= 8 && full ? 12 : 0); K.arp(t, n, quiet ? .8 : 1, step % 2 ? .45 : -.45); } }
    else if (style === 'chill') { if (part !== 'intro' && [0, 3, 6, 10].includes(step)) K.marimba(t, chord[[0, 2, 1, 3][[0, 3, 6, 10].indexOf(step)]] + 12, sp * 3, .5, step % 2 ? .3 : -.3); if (full && step === 8) chord.forEach((n, i) => K.epiano(t + i * .015, n + 12, sp * 5, .6, (i - 1.5) * .25)); }
    else {
      if (d.guitar.includes(step) && part !== 'intro') chord.forEach((n, i) => K.epiano(t + i * .006, n + 12, sp * (style === 'samba' ? 1.4 : 2.2), .78, (i - 1.5) * .28));
      if ((style === 'funk' || style === 'disco') && !quiet && step % 2 === 1 && !d.guitar.includes(step)) K.pluck(t, chord[2] + 12, .05, .42 * heat + .2, .4);
    }
    // ----- melodía -----
    const R = this.RHYTHM[style] || this.RHYTHM.disco, q = (bar % 2) * 16 + step, at = R.indexOf(q), phrase = Math.floor(bar / 2);
    if (at >= 0 && part !== 'intro') {
      const next = at + 1 < R.length ? R[at + 1] : 32, len = Math.min(next - q, 8) * sp * .92, shift = [0, 0, 2, 5][phrase % 4] + (part === 'outro' ? 3 : 0);
      let n = d.melody[(at + shift) % d.melody.length] + d.key; if (at === 0 || at === R.length - 1) n = this.snap(n, chord);
      const second = bar % 2 === 1;
      if (part === 'verse') {
        if (style === 'cumbia') K.reed(t + .01, n, len, .95); else if (style === 'chill') K.flute(t + .01, n, len, .9); else if (style === 'synth') K.lead(t + .01, n, len, .9);
        else if (style === 'samba') K.marimba(t + .01, n + 12, len, .95); else { K.epiano(t + .01, n + 12, len * 1.4, 1.25); K.marimba(t + .01, n + 12, len, .4); }
      } else if (part === 'pre') {
        // pregunta y respuesta: la voz principal un compás, los metales contestan
        if (!second) { if (style === 'chill') K.flute(t + .01, n, len, .9); else if (style === 'cumbia') K.reed(t + .01, n, len, .95); else K.lead(t + .01, n, len, .8); }
        else { K.brass(t + .01, this.snap(n, chord), Math.min(len, sp * 2), .85, -.2); K.brass(t + .01, this.below(this.snap(n, chord), chord), Math.min(len, sp * 2), .7, .2); }
      } else if (full) {
        K.brass(t + .01, n, len, 1, -.18); K.brass(t + .012, this.below(n, chord), len, .78, .18);
        if (style === 'synth') K.lead(t + .01, n + 12, len, .55); else if (heat > .6) K.marimba(t + .01, n + 12, len, .5, .3);
      } else if (part === 'break' && (at % 2 === 0)) { if (style === 'chill' || style === 'cumbia') K.flute(t + .01, n, len * 1.5, .7); else K.marimba(t + .01, n + 12, len, .8, -.2); }
    }
    // contracanto del coro: golpes de metales en el tiempo débil cuando el juego está caliente
    if (full && heat > .75 && (step === 6 || step === 14) && bar % 2 === 1) for (const n of [chord[1] + 12, chord[3] + 12]) K.brass(t, n, sp * 1.2, .6, .3);
  },
};

// ---- conexión con el reproductor existente ----
{
  const legacy = KartMusic.schedule; // temas antiguos (menú/resultados) y partitura anterior
  KartMusic.graph = function (ctx, destination) { return Band.graph(ctx, destination); };
  KartMusic.schedule = function (ctx, g, index, time, mood) {
    if (!STAGE_SCORE[mood] || !g.band) return (STAGE_SCORE[mood] ? legacy : lobbySchedule).call(this, ctx, g, index, time, mood);
    return Band.schedule(ctx, g, index, time, mood);
  };
  KartMusic.heat = .6; KartMusic.tempo = 1;
  // Director: lee el juego y decide intensidad y tempo
  KartMusic.direct = function () {
    let heat = .6, tempo = 1; const s = APP.screen;
    if (s === 'kartRace' && APP.kartRace) { const r = APP.kartRace, p = r.player; const last = p && p.completedLaps >= r.laps - 1 && p.finish == null; heat = last ? 1 : .55 + .15 * Math.min(2, p?.completedLaps || 0); tempo = last ? 1.07 : 1; }
    else if ((s === 'battle' || s === 'netview') && typeof BATTLE !== 'undefined' && BATTLE) { const alive = BATTLE.fighters.filter(f => !f.dead && f.stocks !== 0); const worst = Math.max(0, ...alive.map(f => f.percent || 0)), lastStock = alive.some(f => f.stocks === 1); heat = clamp(.45 + worst / 160 + (lastStock ? .2 : 0), .45, 1); }
    else if (s === 'fpsGame' && APP.fps) { const p = APP.fps.player, m = APP.fps; if (p) { if (p.shot !== this.lastShot || p.hurt > 0) this.lastFight = m.time; this.lastShot = p.shot; const calm = m.time - (this.lastFight ?? -99); heat = calm < 5 ? 1 : clamp(1 - (calm - 5) / 10, .4, 1); if (m.duration - m.time < 30) heat = 1; } }
    else heat = .8;
    this.heat = lerp(this.heat, heat, .04); this.tempo = tempo;
  };
  KartMusic.tick = function () {
    const a = Audio8; if (!this.mood || !a.ready) { if (this.bus && this.context) this.bus.gain.setTargetAtTime(0, this.context.currentTime, .1); return; }
    if (this.context !== a.ctx) { this.context = a.ctx; const g = this.live = this.graph(a.ctx, a.master); g.live = true; this.bus = g.bus; this.delay = g.delay; this.next = 0; }
    this.direct();
    const now = a.ctx.currentTime, paused = (APP.screen === 'kartRace' && APP.kartRace?.paused) || (APP.screen === 'fpsGame' && APP.fps?.paused) || (APP.screen === 'battle' && typeof BATTLE !== 'undefined' && BATTLE?.paused);
    this.bus.gain.setTargetAtTime(a.musicOn ? (paused ? .08 : .2) : 0, now, .12);
    // en calma la mezcla se cierra un poco (menos brillo); en pausa se apaga más
    this.live.tone.frequency.setTargetAtTime(paused ? 900 : lerp(5200, 19000, clamp((this.heat - .4) / .45, 0, 1)), now, .25);
    const sp = 60 / ((this.themes[this.mood] || this.themes.menu).bpm * (STAGE_SCORE[this.mood] ? this.tempo : 1)) / 4; if (this.next < now - .2) this.next = now + .035;
    while (this.next < now + .16) { this.schedule(a.ctx, this.live, this.step++, this.next, this.mood); this.next += sp; }
  };
}
// La arena de la Sierra tiene su propia versión del tema del FPS (otra tonalidad, melodía invertida).
STAGE_SCORE.sierra = { ...STAGE_SCORE.aurora, title: 'Plaza eléctrica', bpm: 118, key: 1, melody: STAGE_SCORE.aurora.melody.slice().reverse(), energy: .85 };
KartMusic.themes.sierra = { bpm: 118, key: 1, lead: .7 };
