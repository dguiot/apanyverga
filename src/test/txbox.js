// Xbox (Edge en una tele 4K): el lienzo no crece a 4K, los ecos del modo navegador (teclas y la flecha
// de ratón que manda el mismo control) no cuentan doble, B no saca de la página, el aviso de
// "Usar controles de juego" aparece y se quita, la rejilla de personajes sube y baja, y si un archivo
// no carga sale un aviso en vez de pantalla negra.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8781'], { cwd: process.cwd(), stdio: 'ignore' });
  process.on('exit', () => { try { srv.kill(); } catch (e) { /* ya cerrado */ } });
  process.on('uncaughtException', e => { console.log('FAIL excepción: ' + e.message); process.exit(1); });
  process.on('unhandledRejection', e => { console.log('FAIL excepción: ' + (e && e.message)); process.exit(1); });
  await new Promise(r => setTimeout(r, 800));
  const URL = 'http://localhost:8781/' + (process.env.PAGE || 'index.html');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0';
  const browser = await chromium.launch();
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const PAD = () => {
    window.__pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [window.__pad, null, null, null];
  };
  const mk = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, userAgent: opts.ua === undefined ? UA : opts.ua });
    if (opts.pad) await ctx.addInitScript(PAD);
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    if (opts.block) await p.route('**/' + opts.block, r => r.abort());
    await p.goto(URL);
    await p.waitForTimeout(opts.wait || 700);
    return p;
  };
  const btn = async (p, i, hold = 90, wait = 150) => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, touched: true, value: 1 }; }, i); await p.waitForTimeout(hold); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, touched: false, value: 0 }; }, i); await p.waitForTimeout(wait); };
  // un toque del modo navegador: el botón del control y su tecla, en el mismo instante
  const both = async (p, i, key, wait = 250) => {
    await p.evaluate(i => { __pad.buttons[i] = { pressed: true, touched: true, value: 1 }; }, i); await p.keyboard.down(key);
    await p.waitForTimeout(90);
    await p.evaluate(i => { __pad.buttons[i] = { pressed: false, touched: false, value: 0 }; }, i); await p.keyboard.up(key);
    await p.waitForTimeout(wait);
  };
  const banner = p => p.evaluate(() => { const b = document.getElementById('tvbox'); return b && !b.hidden ? (b.classList.contains('warn') ? 'warn' : 'tip') : 'off'; });

  // 1) nitidez: en una tele 4K el lienzo se queda en 1280×720 (en una PC con la misma pantalla, 2560×1440)
  const X = await mk({ pad: true });
  const cx = await X.evaluate(() => [canvas.width, canvas.height, canvas.style.width]);
  ok('Xbox en tele 4K: lienzo de 1280×720 estirado a la pantalla', cx[0] === 1280 && cx[1] === 720 && cx[2] === '1920px', cx.join(' '));
  const PC = await mk({ ua: '' });
  const cp = await PC.evaluate(() => [canvas.width, canvas.height, typeof TVBOX, TVBOX.on, !!document.getElementById('tvbox')]);
  ok('PC con la misma pantalla: nitidez normal y sin nada de Xbox', cp[0] === 2560 && cp[1] === 1440 && cp[3] === false && !cp[4], cp.join(' '));
  ok('Xbox: sin luces caras (bloom) desde el arranque', await X.evaluate(() => ART.hi === false));

  // 2) aviso al entrar
  ok('Xbox: aviso de "Usar controles de juego" en la portada', await banner(X) === 'tip');
  const txt = await X.evaluate(() => document.getElementById('tvbox').textContent);
  ok('el aviso dice qué hacer', /Menú/.test(txt) && /controles de juego/.test(txt), txt);

  // 3) ecos del modo navegador: la cruceta llega como botón Y como tecla ↓ → una sola opción
  await btn(X, 0, 90, 400); // A: de la portada al menú
  ok('A del control pasa de la portada al menú', await X.evaluate(() => APP.screen) === 'main', await X.evaluate(() => APP.screen));
  await X.evaluate(() => { APP.menuSel = 0; });
  await both(X, 13, 'ArrowDown');
  const s1 = await X.evaluate(() => APP.menuSel);
  ok('cruceta ↓ + su tecla ↓ (eco): baja UNA opción', s1 === 1, s1);
  ok('el eco se nota: el aviso pasa a advertencia', await banner(X) === 'warn');
  await both(X, 13, 'ArrowDown'); await both(X, 12, 'ArrowUp');
  ok('y siguen contando una vez (↓ ↑ con eco)', await X.evaluate(() => APP.menuSel) === 1, await X.evaluate(() => APP.menuSel));
  // un teclado de verdad (sin botón del control al mismo tiempo) sigue sirviendo
  await X.keyboard.press('ArrowDown'); await X.waitForTimeout(300);
  ok('teclado de verdad: ↓ sola sí baja', await X.evaluate(() => APP.menuSel) === 2, await X.evaluate(() => APP.menuSel));

  // 4) la flecha de ratón que mueve la palanca y el clic de A no pican botones al azar
  const m0 = await X.evaluate(() => Audio8.muted);
  const r = await X.evaluate(() => { const b = canvas.getBoundingClientRect(), s = b.width / W; return { x: b.left + (W - 35) * s, y: b.top + 34 * s }; });
  await X.mouse.move(r.x, r.y); await X.mouse.down(); await X.mouse.up(); await X.waitForTimeout(250);
  ok('clic del navegador (flecha sobre el volumen) no cambia nada', await X.evaluate(() => Audio8.muted) === m0 && await X.evaluate(() => APP.screen) === 'main');

  // 5) B / atrás del navegador no saca del juego
  await X.keyboard.press('Enter'); await X.waitForTimeout(100); // un gesto (Edge salta las entradas sin gesto)
  const h0 = await X.evaluate(() => history.length);
  await X.evaluate(() => history.back()); await X.waitForTimeout(400);
  await X.evaluate(() => history.back()).catch(() => {}); await X.waitForTimeout(400);
  const still = await X.evaluate(() => typeof APP !== 'undefined' && location.href).catch(() => false);
  ok('"atrás" dos veces: sigue en el juego', still && still.startsWith(URL), `${h0} entradas · ${still}`);

  // 6) en "controles de juego" (sin ecos) el aviso se quita solo
  const Y = await mk({ pad: true });
  await btn(Y, 0, 90, 400);
  for (let i = 0; i < 7; i++) await btn(Y, i % 2 ? 12 : 13);
  ok('controles de juego (cruceta sin ecos): el aviso se quita solo', await banner(Y) === 'off');
  // 7) rejilla de personajes: ↑ ↓ con la cruceta
  const g = await Y.evaluate(() => {
    APP.slots = [{ type: 'human', dev: 'pad0', cur: 0, ready: false, edit: 0, team: 0 }, { type: 'cpu', cur: 3, ready: true, pick: CHAR_ORDER[3], level: 5, team: 1 }, { type: 'none' }, { type: 'none' }];
    APP.rules.mode = 'stock'; APP.go('charsel'); return APP.cardCols();
  });
  await Y.waitForTimeout(200);
  await btn(Y, 13, 90, 200); const d1 = await Y.evaluate(() => APP.slots[0].cur);
  await btn(Y, 12, 90, 200); const d2 = await Y.evaluate(() => APP.slots[0].cur);
  ok('personajes: ↓ baja una fila y ↑ la sube', d1 === g && d2 === 0, `columnas ${g}: 0 → ${d1} → ${d2}`);
  // y con las teclas del modo navegador (sin control en la API): también
  const Z = await mk({});
  await Z.keyboard.press('Enter'); await Z.waitForTimeout(300);
  await Z.evaluate(() => { APP.slots = [{ type: 'human', dev: 'kb2', cur: 0, ready: false, edit: 0, team: 0 }, { type: 'cpu', cur: 3, ready: true, pick: CHAR_ORDER[3], level: 5, team: 1 }, { type: 'none' }, { type: 'none' }]; APP.rules.mode = 'stock'; APP.go('charsel'); });
  await Z.waitForTimeout(200);
  await Z.keyboard.press('ArrowDown'); await Z.waitForTimeout(200);
  const k1 = await Z.evaluate(() => APP.slots[0].cur);
  ok('personajes con flechas (sin control): ↓ baja una fila', k1 === g, k1);
  // 8) en la pelea el aviso no estorba
  await Y.evaluate(() => APP.startBattle({ players: [{ port: 0, char: 'nacho', dev: 'pad0' }, { port: 1, char: 'pablo', cpu: 1 }], stage: 'temple', rules: { mode: 'stock', stocks: 3, items: 0 } }));
  await Y.evaluate(() => { TVBOX.browsing = true; }); await Y.waitForTimeout(200);
  ok('en la pelea el aviso se esconde', await banner(Y) === 'off');
  ok('sin errores en Xbox', X.errs.length + Y.errs.length + Z.errs.length === 0, [...X.errs, ...Y.errs, ...Z.errs].slice(0, 3).join(' | '));

  // 9) si un archivo no carga: aviso con Recargar en vez de pantalla negra
  const F = await mk({ block: 'js/menus.js', wait: 8800 });
  const bf = await F.evaluate(() => { const b = document.getElementById('bootfail'); return b ? b.textContent : null; });
  ok('archivo que no carga: aviso "no pudo arrancar" con Recargar', !!bf && /Recargar/.test(bf), bf);
  const G = await mk({ ua: '', wait: 8600 });
  ok('arranque normal: sin ese aviso', await G.evaluate(() => !document.getElementById('bootfail')));

  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close(); srv.kill(); process.exit(fail ? 1 : 0);
})();
