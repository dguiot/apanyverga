// Control táctil que no se congela (iPhone): con Touch Events manda la lista real de dedos.
// iOS manda pointercancel falsos cuando otro dedo se mueve rápido, a veces cancela y reinicia todos los dedos,
// y a veces pierde el touchend: nada de eso puede dejar la palanca o un botón pegados o muertos.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(500);
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => {
    window.__steps = n => { for (let i = 0; i < n; i++) step(); };
    // dedos apoyados: id -> {x, y}; __t manda un TouchEvent con la lista completa, como el navegador
    window.__down = new Map();
    window.__t = (type, id, x, y, { keep = false, list } = {}) => {
      const mk = (i, p) => new Touch({ identifier: i, target: document.elementFromPoint(p.x, p.y) || document.body, clientX: p.x, clientY: p.y });
      if (type === 'touchstart' || type === 'touchmove') __down.set(id, { x, y });
      const changed = [mk(id, { x, y })];
      if ((type === 'touchend' || type === 'touchcancel') && !keep) __down.delete(id);
      const touches = (list || [...__down.keys()]).map(i => mk(i, __down.get(i)));
      const el = document.elementFromPoint(x, y) || document.body;
      const e = new TouchEvent(type, { touches, targetTouches: touches, changedTouches: changed, bubbles: true, cancelable: true });
      return el.dispatchEvent(e);
    };
    window.__p = (type, id, x, y) => (document.elementFromPoint(x, y) || document.body).dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true }));
    window.__btn = a => TouchPad.L.btns.find(b => b.a === a);
    window.__read = () => { const s = TouchPad.read(); return { x: +s.x.toFixed(2), attack: s.attack, jump: s.jump, shield: s.shield, stick: !!TouchPad.stick, held: TouchPad.held.size, fingers: TouchPad.fingers.size }; };
    window.__wait = ms => { const t0 = performance.now(); while (performance.now() - t0 < ms) { /* espera */ } };
    __steps(3);
  });
  // en el menú un toque no es de la palanca y el navegador conserva su gesto (desplazar, clic)
  const menuFree = await ev(() => { const r = __t('touchstart', 1, 400, 200); __t('touchend', 1, 400, 200); return r; });
  ok('en los menús el toque sigue siendo del navegador', menuFree === true);
  ok('el primer toque activa el control y cambia a Touch Events', await ev(() => TouchPad.active && TouchPad.te));
  await ev(() => { APP.startBattle({ players: [{ port: 0, char: 'nacho', dev: 'touch' }, { port: 1, char: 'pablo', cpu: 1 }], stage: 'temple', rules: { mode: 'stock', stocks: 3, items: 0 } }); __steps(200); });
  ok('en la pelea se ven los controles', await ev(() => TouchPad.shown()));

  // 1. palanca a la derecha; un pointercancel falso (otro dedo se mueve rápido) no la suelta
  const y = 300;
  const blocked = await ev(y => { const r = __t('touchstart', 1, 60, y); __t('touchmove', 1, 140, y); return !r; }, y);
  ok('en la pelea el toque ya no es del navegador (sin desplazar ni zoom)', blocked);
  ok('la palanca empuja a la derecha', (await ev(() => __read())).x > 0.9, JSON.stringify(await ev(() => __read())));
  await ev(y => { const A = __btn('attack'); __p('pointerdown', 7, A.x, A.y); __p('pointercancel', 1, 140, y); __p('pointercancel', 7, A.x, A.y); }, y);
  ok('un pointercancel falso de iOS no suelta la palanca', (await ev(() => __read())).x > 0.9);

  // 2. escudo apretado con la palanca: iOS cancela el dedo y lo "reinicia" con otro número en el mismo lugar
  await ev(() => { const S = __btn('shield'); __t('touchstart', 2, S.x, S.y); });
  ok('escudo apretado', (await ev(() => __read())).shield);
  await ev(() => { const S = __btn('shield'); __t('touchcancel', 2, S.x, S.y); });
  const mid = await ev(() => __read());
  await ev(() => { const S = __btn('shield'); __t('touchstart', 3, S.x + 3, S.y + 2); __wait(200); });
  const after = await ev(() => __read());
  ok('cancelar y reiniciar el dedo no parpadea el escudo', mid.shield && after.shield && after.held === 1, JSON.stringify({ mid, after }));
  ok('la palanca sigue viva durante todo eso', after.x > 0.9 && after.stick);
  await ev(() => { const S = __btn('shield'); __t('touchend', 3, S.x + 3, S.y + 2); });
  ok('soltar el escudo lo suelta', !(await ev(() => __read())).shield);

  // 3. un cancel que sí era de verdad (el dedo no vuelve): se suelta poco después
  await ev(() => { const S = __btn('shield'); __t('touchstart', 4, S.x, S.y); __t('touchcancel', 4, S.x, S.y); __wait(200); });
  const real = await ev(() => { __read(); /* el toque cuenta una vez */ return { s: __read(), held: [...TouchPad.held], f: [...TouchPad.fingers] }; });
  ok('un cancel de verdad suelta el botón en un instante', !real.s.shield && real.held.length === 0, JSON.stringify(real));

  // 4. se perdió el touchend de la palanca: el siguiente evento trae la lista real y la palanca se libera
  await ev(y => { __down.delete(1); const A = __btn('attack'); __t('touchstart', 5, A.x, A.y); __wait(200); }, y);
  const lost = await ev(() => __read());
  ok('touchend perdido: la palanca se suelta sola (no se queda corriendo)', !lost.stick && lost.x === 0, JSON.stringify(lost));
  await ev(() => { const A = __btn('attack'); __t('touchend', 5, A.x, A.y); });
  // 5. el pulgar izquierdo vuelve: palanca nueva aunque quedara una vieja colgada
  await ev(y => { TouchPad.stick = { key: 't99', cx: 20, cy: y, x: 20, y }; TouchPad.fingers.set('t99', { x: 20, y, gone: 0 }); __t('touchstart', 6, 80, y); __t('touchmove', 6, 20, y); }, y);
  const fresh = await ev(() => Object.assign(__read(), { old: TouchPad.fingers.has('t99') }));
  ok('una palanca vieja colgada no bloquea la nueva', fresh.stick && fresh.x < -0.8 && !fresh.old, JSON.stringify(fresh));
  await ev(y => __t('touchend', 6, 20, y), y);

  // 6. toque rapidísimo (apoyar y soltar entre dos cuadros) igual cuenta una vez
  await ev(() => { const J = __btn('jump'); __t('touchstart', 8, J.x, J.y); __t('touchend', 8, J.x, J.y); });
  const t1 = await ev(() => __read()), t2 = await ev(() => __read());
  ok('un toque rapidísimo a Saltar se lee una vez', t1.jump && !t2.jump, JSON.stringify({ t1, t2 }));

  // 7. estrés: tres dedos, eventos perdidos al azar; al levantar todos, nada queda pegado y todo responde
  const fuzz = await ev(y => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const L = TouchPad.L, spots = () => { const r = rnd(); if (r < 0.4) return [30 + rnd() * 250, 200 + rnd() * 150]; const b = L.btns[Math.floor(rnd() * L.btns.length)]; return [b.x + (rnd() - 0.5) * 20, b.y + (rnd() - 0.5) * 20]; };
    let id = 100; const live = new Map(); let bad = 0; let __sent;
    for (let k = 0; k < 400; k++) {
      const r = rnd(); __sent = false; const T0 = __t; window.__t = (...a) => { __sent = true; return T0(...a); };
      if (live.size < 3 && r < 0.35) { const [x, yy] = spots(); live.set(++id, [x, yy]); __t('touchstart', id, x, yy); }
      else if (live.size && r < 0.75) { const ids = [...live.keys()], i = ids[Math.floor(rnd() * ids.length)], [x, yy] = live.get(i), nx = x + (rnd() - 0.5) * 60, ny = yy + (rnd() - 0.5) * 40; live.set(i, [nx, ny]); if (rnd() > 0.1) __t('touchmove', i, nx, ny); else __down.set(i, { x: nx, y: ny }); }
      else if (live.size) { const ids = [...live.keys()], i = ids[Math.floor(rnd() * ids.length)], [x, yy] = live.get(i); live.delete(i); const q = rnd(); if (q < 0.15) __down.delete(i); /* touchend perdido */ else if (q < 0.3) { __t('touchcancel', i, x, yy); } else __t('touchend', i, x, yy); }
      if (rnd() < 0.2) __p('pointercancel', 1 + Math.floor(rnd() * 5), 100, 100);
      window.__t = T0; step();
      // en cuanto llega cualquier evento, nunca más dedos registrados que dedos apoyados (los cancelados esperan su gracia aparte)
      const real = [...TouchPad.fingers.values()].filter(f => !f.gone).length;
      if (__sent && real > __down.size) { bad++; if (!window.__bad) window.__bad = JSON.stringify({ k, f: [...TouchPad.fingers], d: [...__down.keys()] }); }
    }
    for (const i of [...__down.keys()]) { const p = __down.get(i); __t('touchend', i, p.x, p.y); }
    __wait(200); const s = __read();
    return { bad, s, first: window.__bad };
  }, y);
  ok('estrés con eventos perdidos: nunca más dedos que los apoyados', fuzz.bad === 0, fuzz.bad + ' ' + fuzz.first);
  ok('al levantar todos los dedos no queda nada pegado', !fuzz.s.stick && fuzz.s.held === 0 && fuzz.s.fingers === 0 && !fuzz.s.attack && !fuzz.s.shield, JSON.stringify(fuzz.s));
  // y el control sigue respondiendo
  const alive = await ev(y => { const f = BATTLE.fighters[0], x0 = f.x; __t('touchstart', 200, 60, y); __t('touchmove', 200, 120, y); __steps(40); const dx = f.x - x0; __t('touchend', 200, 120, y); return Math.round(dx); }, y);
  ok('después de todo el caos el personaje camina con la palanca', Math.abs(alive) > 30, alive);

  // 8. cambiar de app a media pelea suelta todo
  await ev(y => { __t('touchstart', 300, 60, y); __t('touchmove', 300, 120, y); window.dispatchEvent(new Event('pagehide')); }, y);
  ok('salir a otra app suelta la palanca', !(await ev(() => __read())).stick);
  await ev(y => __t('touchend', 300, 120, y), y);
  // 9. pausa con el dedo
  await ev(() => { const P = TouchPad.L.pause; __t('touchstart', 400, P.x, P.y); __steps(2); __t('touchend', 400, P.x, P.y); __steps(2); });
  ok('la pausa responde al toque', await ev(() => !!BATTLE.paused));
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
