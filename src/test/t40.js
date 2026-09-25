// Puentin, el torero: verónica, ¡Olé! al esquivar, estocada con punta, garrocha, faena y la CPU
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(500);
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const r = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < 5; i++) step();
    const run = n => { for (let i = 0; i < n; i++) step(); };
    const setup = (a, b) => {
      APP.startBattle({ players: [{ port: 0, char: a, dev: 'kb1' }, { port: 1, char: b, cpu: 1 }], stage: 'stadium', rules: { mode: 'stock', stocks: 9, items: 0, time: 99 } });
      const B = BATTLE; B.stage.update = () => {};
      for (let i = 0; i < 400 && B.phase !== 'fight'; i++) step();
      const [f, o] = B.fighters; o.brain = null; o.ctrl = new Controller('q1'); f.ctrl = new Controller('q2');
      return [f, o];
    };
    const ground = (q, x, pct) => { const st = BATTLE.stage; q.move = null; q.x = x; q.y = st.top; q.vx = q.vy = q.lx = q.ly = 0; q.grounded = true; q.surface = st.solids[0]; q.setState('idle'); q.invuln = 0; q.percent = pct || 0; q.hitlag = 0; };
    out.inRoster = CHAR_ORDER.includes('puentin') && !!CHARS.puentin && !!SPECIALS.puentin && !!ABILITIES.puentin;
    // ---------- verónica: el rival pasa de largo y cae; el torero queda con el ¡Olé! ----------
    { const [f, o] = setup('puentin', 'nacho');
      ground(f, 0); ground(o, -70); f.face = -1; o.face = 1;
      f.startMove('sp_n'); run(5);
      o.startMove('ftilt'); let guard = 0; while (o.state === 'attack' && guard++ < 60 && !f.oleT) step();
      out.veronica = { ole: !!f.oleT, oState: o.state, side: Math.sign(o.x - f.x), fFace: f.face, pctF: Math.round(f.percent), pctO: Math.round(o.percent) };
      // su siguiente golpe pega más (y solo ese)
      ground(o, 60, 0); f.move = null; f.setState('idle'); f.face = 1; f.x = 0; o.invuln = 0;
      const before = o.percent; f.startMove('jab1'); run(12); const d1 = o.percent - before;
      ground(o, 60, 0); f.move = null; f.setState('idle'); run(10); f.startMove('jab1'); run(12); const d2 = o.percent;
      out.oleBonus = { first: +d1.toFixed(2), second: +d2.toFixed(2) };
    }
    // ---------- esquivar justo: ¡Olé! ----------
    { const [f, o] = setup('puentin', 'daniel');
      ground(f, 0); ground(o, -60); o.face = 1; f.face = -1;
      o.startMove('ftilt'); run(2); f.startSpotDodge(); run(20);
      out.dodgeOle = { ole: !!f.oleT, pct: Math.round(f.percent) };
      // un golpe normal (sin esquivar) no da ¡Olé!
      const [g, p] = setup('puentin', 'daniel'); ground(g, 0); ground(p, -60); p.face = 1; p.startMove('ftilt'); run(20);
      out.noDodgeOle = { ole: !!g.oleT, pct: Math.round(g.percent) };
    }
    // ---------- estocada: la punta manda más lejos que el golpe de cerca ----------
    { const hitAt = (dx) => { const [f, o] = setup('puentin', 'nacho'); ground(f, 0); ground(o, dx, 80); f.face = 1; f.startMove('fsmash'); run(30); return { pct: Math.round(o.percent), kb: Math.round(Math.hypot(o.lx, o.ly) * 10) / 10 }; };
      out.tip = hitAt(118); out.sour = hitAt(55); }
    // ---------- garrocha: sube y vuelve a la orilla ----------
    { const [f] = setup('puentin', 'nacho'); const st = BATTLE.stage; ground(f, 0); const y0 = f.y; f.startMove('sp_u'); let top = f.y; for (let i = 0; i < 50; i++) { step(); top = Math.min(top, f.y); } out.vault = Math.round(y0 - top); }
    // ---------- banderillas: avanza de frente ----------
    { const [f] = setup('puentin', 'nacho'); ground(f, 0); f.face = 1; f.startMove('sp_s'); run(30); out.bander = Math.round(f.x); }
    // ---------- faena de gala: pases y estocada ----------
    { const [f, o] = setup('puentin', 'nacho'); ground(f, 0); ground(o, 200, 60); f.finalReady = true; f.startMove('sp_f'); f.invuln = 200; run(175); out.final = { pct: Math.round(o.percent), flying: Math.round(Math.hypot(o.lx, o.ly)), state: o.state }; }
    // ---------- dibujo: capote, espada y montera sin errores ----------
    { const [f] = setup('puentin', 'nacho'); for (const k of ['jab3', 'ftilt', 'fsmash', 'sp_n', 'sp_s', 'sp_u', 'sp_d']) { ground(f, 0); f.startMove(k); run(12); render(); } out.drawn = true; }
    // ---------- la CPU lo usa: pelea completa sin trabarse ----------
    { APP.startBattle({ players: [{ port: 0, char: 'puentin', cpu: 8 }, { port: 1, char: 'mariachi', cpu: 8 }], stage: 'stadium', rules: { mode: 'stock', stocks: 2, items: 0, time: 99 } });
      const B = BATTLE, used = {}; const f = B.fighters[0];
      for (let i = 0; i < 60 * 150 && B.phase !== 'results' && !B.over; i++) { step(); if (f.move && f.move.key && f.move.bornT === B.t - 1) used[f.move.key] = (used[f.move.key] || 0) + 1; }
      out.cpu = { used, phase: B.phase, oles: 0 };
    }
    return out;
  });
  console.log(JSON.stringify(r));
  ok('Puentin está en el juego (personaje, especiales y habilidad)', r.inRoster);
  ok('verónica: el rival pasa de largo por el capote y cae', r.veronica.ole && r.veronica.oState === 'down' && r.veronica.pctF === 0, JSON.stringify(r.veronica));
  ok('¡Olé!: el siguiente golpe pega 30% más, y solo ese', r.oleBonus.first > r.oleBonus.second * 1.25 && r.oleBonus.second > 0, JSON.stringify(r.oleBonus));
  ok('esquivar justo un golpe da ¡Olé!', r.dodgeOle.ole && r.dodgeOle.pct === 0, JSON.stringify(r.dodgeOle));
  ok('recibir el golpe no da ¡Olé!', !r.noDodgeOle.ole && r.noDodgeOle.pct > 0, JSON.stringify(r.noDodgeOle));
  ok('estocada: la punta pega y manda más lejos que de cerca', r.tip.pct > r.sour.pct && r.tip.kb > r.sour.kb * 1.2, `punta ${JSON.stringify(r.tip)} · cerca ${JSON.stringify(r.sour)}`);
  ok('salto de garrocha: sube como una recuperación de verdad', r.vault > 180, r.vault + ' px');
  ok('banderillas: avanza de frente', r.bander > 100, r.bander + ' px');
  ok('faena de gala: pases, estocada y sale volando', r.final.pct >= 25 && r.final.flying > 15, JSON.stringify(r.final));
  ok('la CPU usa su capote, la estocada y sus especiales', Object.keys(r.cpu.used).length >= 8 && (r.cpu.used.fsmash || 0) > 0, JSON.stringify(r.cpu.used));
  console.log(`\n${pass} OK · ${fail} FAIL`);
  console.log('ERRORS', errs.length, '\n' + [...new Set(errs)].slice(0, 8).join('\n'));
  await browser.close();
  process.exit(fail || errs.length ? 1 : 0);
})();
