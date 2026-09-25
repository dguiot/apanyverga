// El control llega a TODOS los botones de TODAS las pantallas (volumen, Volver, Cámara y voz,
// Invitar, niveles de la CPU…): desde cada casilla del cursor propio y desde cada botón alcanzado,
// la cruceta recorre; todo lo que la pantalla deja picar con el ratón tiene que quedar alcanzable.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.__pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [window.__pad, null, null, null];
  });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(500);
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  await page.evaluate(() => {
    window.__steps = n => { for (let i = 0; i < n; i++) step(); };
    window.__press = b => { __pad.buttons[b] = { pressed: true, touched: true, value: 1 }; step(); __pad.buttons[b] = { pressed: false, touched: false, value: 0 }; step(); };
    const H = () => ({ type: 'human', dev: 'pad0', cur: 0, ready: false, edit: 0, team: 0 }), NONE = () => ({ type: 'none' });
    const off = () => { Net.role = 'off'; Net.ok = false; Net.code = null; };
    window.__SETUPS = {
      title: () => { off(); APP.go('title'); },
      main: () => { off(); APP.go('main'); APP.menuSel = 0; },
      modesel: () => { off(); APP.slots = [H(), NONE(), NONE(), NONE()]; APP.go('modesel'); APP.modeSel = 0; APP.rules.mode = 'stock'; },
      charsel: () => { off(); APP.slots = [H(), { type: 'cpu', cur: 3, ready: true, pick: CHAR_ORDER[3], level: 5, team: 1 }, NONE(), NONE()]; APP.go('charsel'); },
      'charsel listo': () => { off(); const h = H(); h.ready = true; h.pick = CHAR_ORDER[0]; h.focus = 0; APP.slots = [h, { type: 'cpu', cur: 3, ready: true, pick: CHAR_ORDER[3], level: 5, team: 1 }, NONE(), NONE()]; APP.go('charsel'); },
      stagesel: () => { off(); APP.slots = [Object.assign(H(), { ready: true, pick: 'nacho' }), { type: 'cpu', cur: 3, ready: true, pick: CHAR_ORDER[3], level: 5, team: 1 }, NONE(), NONE()]; APP.rules.mode = 'stock'; APP.go('stagesel'); APP.stageRow = 0; APP.stageSel = 0; },
      controls: () => { off(); APP.go('controls'); APP.ctrlTab = 0; },
      binds: () => { off(); APP.bind = { col: 0, dev: 0, row: 0, msg: '' }; APP.go('binds'); },
      'binds (botones)': () => { off(); APP.bind = { col: 1, dev: 0, row: 0, msg: '' }; APP.go('binds'); },
      fame: () => { off(); APP.go('fame'); },
      online: () => { off(); APP.go('online'); },
      results: () => {
        off(); APP.slots = [Object.assign(H(), { ready: true, pick: 'nacho' }), { type: 'cpu', cur: 3, ready: true, pick: CHAR_ORDER[3], level: 5, team: 1 }, NONE(), NONE()];
        if (!window.__res) { APP.startBattle({ players: [{ port: 0, char: 'nacho', dev: 'pad0' }, { port: 1, char: 'pablo', cpu: 1 }], stage: 'temple', rules: { mode: 'stock', stocks: 1, items: 0 } }); __steps(10); window.__res = APP.battle.results(); }
        APP.showResults(window.__res); APP.t = 60;
      },
      // en línea (sala simulada): anfitrión con Cámara y voz e Invitar arriba
      'sala del anfitrión': () => { off(); Net.role = 'host'; Net.ok = true; Net.code = 'K7QX'; APP.slots = [{ type: 'human', dev: 'local', cur: 0, ready: false, edit: 0, team: 0 }, NONE(), NONE(), NONE()]; APP.go('charsel'); },
      'modo del anfitrión': () => { off(); Net.role = 'host'; Net.ok = true; Net.code = 'K7QX'; APP.slots = [{ type: 'human', dev: 'local', cur: 0, ready: false, edit: 0, team: 0 }, NONE(), NONE(), NONE()]; APP.go('modesel'); APP.modeSel = 0; },
      'sala del invitado': () => { off(); Net.role = 'guest'; Net.ok = true; Net.hostPeer = 'hostpeer'; Net.lostHostT = 0; Net.guest = { ch: 0, rdy: 0, tm: -1, cnt: BUTTONS.map(() => 0) }; APP.go('netroom'); },
    };
    const DIRS = [12, 13, 14, 15];
    window.__explore = name => {
      const setup = __SETUPS[name];
      const fresh = () => { setup(); UIFocus.off(); __steps(3); };
      fresh();
      const dev = Net.role === 'off' ? 'pad0' : 'local', nat = () => APP.focusNative(dev);
      const E = UIFocus.extras(nat()).map(t => t.k);
      const reach = new Set(), queue = [];
      const note = () => { if (UIFocus.cur && !reach.has(UIFocus.cur.k)) { reach.add(UIFocus.cur.k); queue.push(UIFocus.cur.k); } };
      const N = (nat().items || []).length;
      for (let i = 0; i < Math.max(1, N); i++) for (const b of DIRS) { fresh(); if (N) { nat().sel(i); step(); } __press(b); note(); }
      while (queue.length) {
        const k = queue.shift();
        for (const b of DIRS) { fresh(); const t = UIFocus.list.find(t => t.k === k); if (!t) continue; UIFocus.cur = t; UIFocus.dev = dev; __press(b); note(); }
      }
      return { n: E.length, missing: E.filter(k => !reach.has(k)), screen: APP.screen };
    };
  });
  for (const name of await page.evaluate(() => Object.keys(__SETUPS))) {
    const r = await page.evaluate(n => __explore(n), name);
    ok(`${name}: el control llega a los ${r.n} botones`, r.missing.length === 0 && r.n > 0, r.missing.length ? 'faltan ' + r.missing.join(' | ') : undefined);
  }
  // picar de verdad: el volumen desde el menú principal (→) y Volver desde la selección de personajes (↓)
  const mute = await page.evaluate(() => {
    __SETUPS.main(); __steps(3); const m0 = Audio8.muted;
    __press(15); const onMute = UIFocus.cur && UIFocus.cur.k; __press(0); const m1 = Audio8.muted; if (m1 !== m0) Audio8.setMuted(m0);
    return { onMute, flipped: m1 !== m0, screen: APP.screen };
  });
  ok('menú principal: → llega al volumen y A lo cambia (sin entrar a ninguna opción)', mute.onMute === 'mute' && mute.flipped && mute.screen === 'main', JSON.stringify(mute));
  const volver = await page.evaluate(() => {
    __SETUPS.charsel(); __steps(3);
    const seen = [];
    for (let i = 0; i < 8 && !(UIFocus.cur && UIFocus.cur.x === 40 && UIFocus.cur.y === 660); i++) { __press(13); seen.push(UIFocus.cur ? UIFocus.cur.k : 'cursor ' + APP.slots[0].cur); }
    for (let i = 0; i < 4 && !(UIFocus.cur && UIFocus.cur.x === 40 && UIFocus.cur.y === 660); i++) { __press(14); seen.push(UIFocus.cur ? UIFocus.cur.k : '-'); }
    const at = UIFocus.cur && UIFocus.cur.k; __press(0);
    return { at, screen: APP.screen, seen };
  });
  ok('personajes: ↓ baja de la rejilla a los botones y A en Volver regresa al modo', volver.screen === 'modesel', JSON.stringify(volver));
  const up = await page.evaluate(() => {
    __SETUPS['sala del anfitrión'](); __steps(3);
    __press(12); const a = UIFocus.cur && UIFocus.cur.k; // de la fila de arriba sube a la barra
    const seen = [a]; for (let i = 0; i < 4; i++) { __press(15); seen.push(UIFocus.cur && UIFocus.cur.k); }
    __press(13); const back = { cur: UIFocus.cur, slot: APP.slots[0].cur };
    return { seen, back };
  });
  ok('sala en línea: ↑ sube a Invitar y → recorre Cámara y voz hasta el volumen', up.seen[0] === 'invite' && up.seen.includes('av') && up.seen.includes('mute'), JSON.stringify(up.seen));
  ok('y ↓ regresa a la rejilla de personajes', !up.back.cur, JSON.stringify(up.back));
  const bExit = await page.evaluate(() => { __SETUPS.main(); __steps(3); __press(15); const a = !!UIFocus.cur; __press(1); return { a, off: !UIFocus.cur, screen: APP.screen }; });
  ok('B quita el marco sin salir de la pantalla', bExit.a && bExit.off && bExit.screen === 'main', JSON.stringify(bExit));
  // la lista del menú sigue igual con la cruceta: ↓ baja de opción
  const list = await page.evaluate(() => { __SETUPS.main(); __steps(3); __press(13); __press(13); return { sel: APP.menuSel, cur: !!UIFocus.cur }; });
  ok('el menú de siempre sigue: ↓↓ baja dos opciones', list.sel === 2 && !list.cur, JSON.stringify(list));
  await page.evaluate(() => { __SETUPS['sala del anfitrión'](); __steps(3); __press(12); __press(15); render(); });
  await page.screenshot({ path: 'shots/look/focus-av.png' });
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
