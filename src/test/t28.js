// Música: compases completos, mezcla sin saturar, aleatorio sin repetir, cambio de tono y transición
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(400);
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const ev = (fn, a) => page.evaluate(fn, a);
  const names = await ev(() => Object.keys(Audio8.SONGS));
  ok('7 piezas: menú (también en pelea), 5 de pelea y resultados', names.length === 7 && await ev(() => Audio8.BATTLE_SONGS.length === 6), names.join(','));
  for (const n of names) {
    const r = await ev(n => { const s = Audio8.compile(n); return { bad: s.bad, len: s.len, secs: +(s.len * s.sp).toFixed(1), passes: s.passes, notes: s.ev.flat().filter(e => e.n != null && !e.h && e.v !== 'bass' && e.v !== 'arp').length }; }, n);
    ok(`${n}: todos los compases cuadran`, r.bad.length === 0, r.bad.join('; ') || `${r.secs}s por vuelta, ${r.passes} vueltas, ${r.notes} notas de melodía`);
  }
  // mezcla: se renderiza cada pieza sin conexión y se mide pico y RMS
  const levels = await ev(async (names) => {
    const A = Audio8, out = {};
    const desc = Object.getOwnPropertyDescriptor(A, 'ready');
    Object.defineProperty(A, 'ready', { get: () => true, configurable: true });
    const saved = { ctx: A.ctx, musGain: A.musGain, song: A.song };
    for (const n of names) {
      const secs = 16, oc = new OfflineAudioContext(1, 44100 * secs, 44100);
      A.ctx = oc; A.musGain = oc.createGain(); A.musGain.gain.value = 0.16 * 0.7; A.musGain.connect(oc.destination);
      if (!A.noiseBuf) { A.noiseBuf = oc.createBuffer(1, 44100, 44100); const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      A.playSong(n, { force: true, shuffle: false });
      let t = 0.05;
      while (t < secs - 0.8) { A.playStep(A.step, t, A.song.sp); t += A.song.sp; if (++A.step >= A.song.len) A.endPass(); }
      const buf = await oc.startRendering(), d = buf.getChannelData(0);
      let pk = 0, ss = 0, nan = 0;
      for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) nan++; else { pk = Math.max(pk, Math.abs(v)); ss += v * v; } }
      out[n] = { peak: +pk.toFixed(3), rms: +Math.sqrt(ss / d.length).toFixed(4), nan };
    }
    A.ctx = saved.ctx; A.musGain = saved.musGain; A.song = saved.song; A._bus = null;
    delete A.ready; Object.defineProperty(A, 'ready', desc);
    return out;
  }, names);
  const rmsAll = Object.values(levels).map(l => l.rms);
  for (const n of names) ok(`${n}: suena sin saturar`, levels[n].nan === 0 && levels[n].peak < 0.6 && levels[n].rms > 0.012, JSON.stringify(levels[n]));
  ok('volumen parejo entre canciones (máx/mín < 2.2)', Math.max(...rmsAll) / Math.min(...rmsAll) < 2.2, (Math.max(...rmsAll) / Math.min(...rmsAll)).toFixed(2));
  // aleatorio: nunca la misma dos veces seguidas y todas salen
  const seq = await ev(() => { const s = []; for (let i = 0; i < 60; i++) s.push(Audio8.playBattle(false)); return s; });
  ok('aleatorio sin repetir la anterior', seq.every((n, i) => i === 0 || n !== seq[i - 1]), seq.slice(0, 10).join(','));
  ok('salen las 6 canciones', new Set(seq).size === 6);
  // cambio de tono en la última vuelta y luego otra canción
  const flow = await ev(() => {
    const A = Audio8; A.playBattle(false);
    const S = A.song, first = S.name, trs = [];
    for (let p = 0; p < S.passes; p++) { trs.push(A.song.tr); A.step = S.len - 1; A.step++; A.endPass(); }
    return { first, next: A.song.name, trs, passes: S.passes, up: S.def.up, battle: A.BATTLE_SONGS };
  });
  ok('solo la última vuelta sube de tono', flow.trs[flow.trs.length - 1] > 0 && flow.trs.slice(0, -1).every(t => t === 0), JSON.stringify(flow));
  ok('al terminar sus vueltas cambia a otra canción', flow.next !== flow.first && flow.battle.includes(flow.next), `${flow.first} → ${flow.next}`);
  // el menú es el jingle y la pelea anuncia la canción
  await ev(() => { window.__tap = c => { window.dispatchEvent(new KeyboardEvent('keydown', { code: c })); for (let i = 0; i < 2; i++) step(); window.dispatchEvent(new KeyboardEvent('keyup', { code: c })); for (let i = 0; i < 5; i++) step(); }; for (let i = 0; i < 5; i++) step(); __tap('Enter'); });
  ok('el menú toca el jingle', await ev(() => Audio8.song && Audio8.song.name === 'menu'), await ev(() => Audio8.song && Audio8.song.name));
  const bt = await ev(() => { Audio8.nowPlaying = null; const b = new Battle({ players: [{ port: 0, char: 'nacho', dev: 'kb1' }, { port: 1, char: 'pablo', cpu: 3 }], stage: 'temple', rules: { mode: 'stock', stocks: 1 } }); return { song: Audio8.song && Audio8.song.name, toast: Audio8.nowPlaying ? '♪ ' + Audio8.nowPlaying.title : '' }; });
  ok('la pelea arranca con una canción de pelea', await ev(() => Audio8.BATTLE_SONGS.includes(Audio8.song.name)), bt.song);
  ok('y avisa cuál es', /♪/.test(bt.toast), bt.toast);
  const demo = await ev(() => { Audio8.playSong('menu'); new Battle({ players: [{ port: 0, char: 'nacho', cpu: 5 }, { port: 1, char: 'pablo', cpu: 5 }], stage: 'temple', rules: { mode: 'stock', stocks: 1 } }, { demo: true }); return Audio8.song.name; });
  ok('la demo del título no corta el jingle', demo === 'menu', demo);
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' || '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
