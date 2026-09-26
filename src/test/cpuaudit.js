// Auditoría de la IA: CPU contra CPU (y contra un rival quieto) en todos los escenarios, buscando lo que se ve
// "tonto": quedarse parada o vibrando sin avanzar, repetir el mismo golpe sin pegar, escudo que se prende y
// apaga, saltar en su lugar. Cada caso se anota con la línea de ai.js que decidió (instrumentada al vuelo).
//   node cpuaudit.js            → resumen por tipo y por línea de ai.js
//   SECS=60 PAIRS=1 node cpuaudit.js · ONLY=tipo · SHOW=n (casos de ejemplo)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  // copia instrumentada: cada "return" de la IA deja anotada su línea en brain.why
  const root = process.cwd(), out = path.join(root, '.audit'); // se corre desde la carpeta del juego, como las demás pruebas
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'js'), { recursive: true });
  for (const f of fs.readdirSync(path.join(root, 'js'))) fs.copyFileSync(path.join(root, 'js', f), path.join(out, 'js', f));
  fs.cpSync(path.join(root, 'fonts'), path.join(out, 'fonts'), { recursive: true });
  fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
  const ai = fs.readFileSync(path.join(root, 'js/ai.js'), 'utf8').split('\n').map((l, i) => l.replace(/return s;/g, `{ this.why = ${i + 1}; return s; }`).replace(/return (this\.soccer\([^;]*\));/g, `{ this.why = ${i + 1}; return $1; }`));
  fs.writeFileSync(path.join(out, 'js/ai.js'), ai.join('\n'));
  const aiLines = fs.readFileSync(path.join(root, 'js/ai.js'), 'utf8').split('\n');

  const browser = await chromium.launch(); const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + out + '/index.html'); await page.waitForTimeout(500);
  const SECS = +(process.env.SECS || 60), PAIRS = +(process.env.PAIRS || 1), SEED = +(process.env.SEED || 7);
  const res = await page.evaluate(([SECS, PAIRS, SEED]) => {
    let seed = SEED; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const eps = [];
    const stages = STAGE_INFO.map(s => s.id), LV = [3, 5, 7, 9];
    const runs = [];
    CHAR_ORDER.forEach((c, i) => stages.forEach((st, j) => { for (let k = 0; k < PAIRS; k++) runs.push({ kind: 'cpu', chars: [c, CHAR_ORDER[(i + j * 2 + 3 + k * 5) % CHAR_ORDER.length]], stage: st, lv: [LV[(i + j + k) % 4], LV[(i + 2 * j + 1 + k) % 4]], items: (i + j) % 3 === 0 ? 2 : 0 }); }));
    // contra una persona que no se mueve (como cuando el control se congela)
    CHAR_ORDER.forEach((c, i) => runs.push({ kind: 'idle', chars: ['daniel', c], stage: stages[i % stages.length], lv: [0, LV[i % 4]], items: 0 }));
    // todos contra todos
    for (let i = 0; i < 16; i++) runs.push({ kind: 'ffa', chars: [0, 1, 2, 3].map(k => CHAR_ORDER[(i * 4 + k * 3) % CHAR_ORDER.length]), stage: stages[i % stages.length], lv: [3, 5, 7, 9].map((l, k) => LV[(i + k) % 4]), items: i % 2 ? 2 : 0 });
    let cpuFrames = 0;
    for (const R of runs) {
      const players = R.chars.map((ch, p) => R.kind === 'idle' && p === 0 ? { port: 0, char: ch, dev: 'kb1' } : { port: p, char: ch, cpu: R.lv[p] });
      APP.startBattle({ players, stage: R.stage, rules: { mode: 'stock', stocks: 99, items: R.items, time: 0 } });
      const B = BATTLE;
      const tr = B.fighters.map(() => ({ x: [], y: [], face: [], ix: [], st: [], why: [], dealt: [], mv: [], ok: [], tgt: [] }));
      for (let t = 0; t < SECS * 60; t++) {
        step();
        B.fighters.forEach((f, i) => {
          const T = tr[i];
          if (!f.cpu) return;
          const opp = B.fighters.filter(o => o !== f && !o.dead && o.state !== 'respawn').sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
          T.x.push(f.x); T.y.push(f.y); T.face.push(f.face); T.ix.push(f.brain ? f.brain.ctrl.cur.x : 0); T.st.push(f.state);
          T.why.push(f.brain ? f.brain.why || 0 : 0); T.dealt.push(f.stats.dealt);
          T.mv.push(f.state === 'attack' && f.move && f.move.f === 1 ? f.move.key : null);
          // "puede actuar": vivo, no aturdido ni volando golpeado, no reapareciendo
          // en el volcán con la lava arriba, quedarse en la plataforma es lo correcto
          T.ok.push(B.phase === 'fight' && !(B.stage.lavaPhase && B.stage.lavaPhase !== 'idle') && !f.dead && !['respawn', 'hitstun', 'grabbed', 'down', 'dizzy', 'ledge', 'climb'].includes(f.state) && !(f.hitlag > 0));
          T.tgt.push(opp ? [Math.round(opp.x - f.x), Math.round(opp.y - f.y), opp.state, opp.x < B.stage.left - 20 || opp.x > B.stage.right + 20 || (!opp.grounded && opp.y > B.stage.top + 30)] : null);
          cpuFrames++;
        });
      }
      // detectores
      B.fighters.forEach((f, i) => {
        if (!f.cpu) return;
        const T = tr[i], n = T.x.length, info = { run: R.kind, ch: f.id, lv: f.brain ? f.brain.L.lv : 0, stage: R.stage, vs: R.chars.filter((c, k) => k !== i).join('/') };
        const whyTop = (a, b) => { const m = {}; for (let k = a; k < b; k++) m[T.why[k]] = (m[T.why[k]] || 0) + 1; return Object.entries(m).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([w, c]) => w + ':' + c).join(' '); };
        const push = (type, a, b, extra) => { const last = eps[eps.length - 1]; if (last && last.type === type && last.ch === f.id && last.run === R.kind && last.stage === R.stage && a - last.b < 30) { last.b = b; return; } eps.push(Object.assign({ type, a, b, why: whyTop(a, b), x: Math.round(T.x[a]), y: Math.round(T.y[a]), st: T.st.slice(a, Math.min(b, a + 12)).join(','), tgt: T.tgt[a] }, info, extra)); };
        // 1) vibrar: cambia de dirección o de cara muchas veces sin avanzar
        for (let k = 60; k < n; k += 10) {
          let flips = 0, sx = 0, okc = 0;
          for (let q = k - 59; q <= k; q++) { if (T.face[q] !== T.face[q - 1]) flips++; if (Math.abs(T.ix[q]) > 0.25 && Math.abs(T.ix[q - 1]) > 0.25 && Math.sign(T.ix[q]) !== Math.sign(T.ix[q - 1])) sx++; if (T.ok[q]) okc++; }
          const moved = Math.abs(T.x[k] - T.x[k - 60]);
          if (okc > 50 && (flips >= 6 || sx >= 8) && moved < 60 && T.dealt[k] === T.dealt[k - 60]) push('vibra', k - 60, k, { flips, sx });
        }
        // 2) atorada: 2.5 s sin avanzar ni pegar, pudiendo actuar y con el rival lejos
        for (let k = 150; k < n; k += 15) {
          let okc = 0, far = 0, eng = 0; for (let q = k - 149; q <= k; q++) { if (T.ok[q]) okc++; const g = T.tgt[q]; if (g && Math.hypot(g[0], g[1]) > 140) far++; if (g && !g[3] && g[2] !== 'hitstun' && g[2] !== 'respawn') eng++; }
          if (eng < 90) continue; // el rival volando golpeado o fuera del escenario: esperarlo en la orilla es lo normal
          const mv = Math.hypot(T.x[k] - T.x[k - 150], T.y[k] - T.y[k - 150]);
          let path = 0; for (let q = k - 149; q <= k; q++) path += Math.abs(T.x[q] - T.x[q - 1]);
          if (okc > 140 && far > 120 && mv < 30 && T.dealt[k] === T.dealt[k - 150]) push('atorada', k - 150, k, { path: Math.round(path), tgtOff: !!(T.tgt[k] && T.tgt[k][3]) });
        }
        // 3) el mismo golpe una y otra vez sin pegar
        const starts = []; for (let k = 0; k < n; k++) if (T.mv[k]) starts.push([k, T.mv[k]]);
        for (let s = 0; s < starts.length; s++) {
          let e = s; while (e + 1 < starts.length && starts[e + 1][1] === starts[s][1] && starts[e + 1][0] - starts[s][0] < 360) e++;
          const cnt = e - s + 1, a = starts[s][0], b = starts[e][0] + 30;
          if (cnt >= 6 && T.dealt[Math.min(n - 1, b)] === T.dealt[a]) { push('repite', a, b, { key: starts[s][1], cnt }); s = e; }
        }
        // 4) escudo que se prende y apaga
        for (let k = 180; k < n; k += 20) { let ent = 0; for (let q = k - 179; q <= k; q++) if (T.st[q] === 'shield' && T.st[q - 1] !== 'shield') ent++; if (ent >= 6 && T.dealt[k] === T.dealt[k - 180]) push('escudo', k - 180, k, { ent }); }
        // 5) saltar en su lugar
        for (let k = 240; k < n; k += 20) { let j = 0; for (let q = k - 239; q <= k; q++) if (T.st[q] === 'jumpsquat' && T.st[q - 1] !== 'jumpsquat') j++; if (j >= 6 && Math.abs(T.x[k] - T.x[k - 240]) < 80 && T.dealt[k] === T.dealt[k - 240]) push('salta', k - 240, k, { j }); }
      });
      BATTLE = null;
    }
    return { eps, cpuMin: cpuFrames / 3600, runs: runs.length };
  }, [SECS, PAIRS, SEED]);
  const eps = res.eps.filter(e => !process.env.ONLY || e.type === process.env.ONLY);
  const byType = {}; for (const e of eps) { byType[e.type] = byType[e.type] || { n: 0, secs: 0 }; byType[e.type].n++; byType[e.type].secs += (e.b - e.a) / 60; }
  console.log(`${res.runs} peleas · ${res.cpuMin.toFixed(0)} min de CPU · ${eps.length} casos`);
  for (const [t, v] of Object.entries(byType)) console.log(`  ${t.padEnd(8)} ${String(v.n).padStart(4)} casos · ${v.secs.toFixed(0)} s · ${(v.n / res.cpuMin).toFixed(2)} por min de CPU`);
  // líneas de ai.js que más aparecen en cada tipo
  const lines = {}; for (const e of eps) { const w = e.why.split(' ')[0].split(':')[0]; const k = e.type + ' @' + w; lines[k] = (lines[k] || 0) + 1; }
  console.log('\nlíneas de ai.js responsables (tipo @línea: casos):');
  for (const [k, c] of Object.entries(lines).sort((a, b) => b[1] - a[1]).slice(0, 24)) { const ln = +k.split('@')[1]; console.log(`  ${k.padEnd(16)} ${String(c).padStart(4)}   ${(aiLines[ln - 1] || '').trim().slice(0, 110)}`); }
  const byChar = {}; for (const e of eps) byChar[e.ch] = (byChar[e.ch] || 0) + 1;
  console.log('\npor personaje:', Object.entries(byChar).sort((a, b) => b[1] - a[1]).map(([c, n]) => c + ' ' + n).join(' · '));
  const SHOW = +(process.env.SHOW || 0);
  if (SHOW) for (const e of eps.slice(0, SHOW)) console.log(JSON.stringify(e));
  fs.writeFileSync(path.join(root, 'cpuaudit.json'), JSON.stringify(res.eps));
  if (errs.length) console.log('ERRORES', errs.slice(0, 3));
  if (process.env.MAX) {
    const rate = eps.length / res.cpuMin, grabLoops = eps.filter(e => e.type === 'repite' && e.key === 'grab').length;
    const pass = rate <= +process.env.MAX && grabLoops <= 2 && !errs.length;
    console.log(`\n${pass ? 'OK  ' : 'FAIL'} CPU: ${rate.toFixed(2)} casos raros por minuto (tope ${process.env.MAX}) · agarres al aire en bucle: ${grabLoops}`);
    console.log(`\n${pass ? 1 : 0} OK, ${pass ? 0 : 1} FAIL`);
    await browser.close(); process.exit(pass ? 0 : 1);
  }
  await browser.close();
})();
