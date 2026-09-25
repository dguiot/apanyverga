// Versión web desde el celular: entrar como invitado a la sala de alguien en la compu, moverse con la palanca
// táctil durante la pelea del anfitrión; la cara de cada quien va en su cuadrito del marcador, que en celular
// va arriba (abajo lo taparían los pulgares).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8771'], { cwd: process.cwd() + '/web', stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const mkCtx = async opts => { const c = await browser.newContext(Object.assign({ permissions: ['camera', 'microphone'] }, opts)); await c.addInitScript({ path: 'mocksupa.js' }); await c.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.APYV_CONFIG = { client: window.__mockClient, ice: [] };' })); return c; };
  // la "base" simulada vive en localStorage y el canal en BroadcastChannel: las dos páginas van en el mismo contexto
  const ctx = await mkCtx({ viewport: { width: 1280, height: 720 } });
  const errs = []; let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const waitFor = async (p, fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(120); } return false; };
  const key = async (p, k, wait = 200) => { await p.keyboard.down(k); await p.waitForTimeout(50); await p.keyboard.up(k); await p.waitForTimeout(wait); };
  const watch = (p, n) => { p.on('pageerror', e => errs.push(n + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(n + ' ' + m.text().slice(0, 160)); }); p.on('dialog', d => d.accept(n)); };
  const A = await ctx.newPage(); watch(A, 'Ana'); await A.goto('http://localhost:8771/index.html'); await A.evaluate(() => localStorage.clear()); await A.reload(); await A.waitForTimeout(600);
  // el celular: pantalla táctil, de lado (se emula con un contexto aparte que comparte el mismo "Supabase" por BroadcastChannel no: mismo contexto con otra página)
  const P = await ctx.newPage(); watch(P, 'Dani');
  await P.setViewportSize({ width: 844, height: 390 });
  await P.goto('http://localhost:8771/index.html'); await P.waitForTimeout(600);
  // Ana crea la sala en la compu
  await A.evaluate(() => { APP.firstDev = 'kb1'; APP.go('online'); APP.onSel = 0; }); await A.waitForTimeout(500); await key(A, 'Enter', 400); await key(A, 'Enter', 400);
  await key(A, 'KeyJ', 300);
  ok('Ana tiene su sala abierta', await A.evaluate(() => APP.screen) === 'charsel');
  // Dani toca la pantalla en el celular, entra al online y a la sala de Ana tocando
  const tap = (x, y) => P.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y) || document.body; for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, { pointerId: 50, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true })); }, [x, y]);
  const tapL = (lx, ly) => P.evaluate(([lx, ly]) => { const r = canvas.getBoundingClientRect(); return [r.left + lx / 1280 * r.width, r.top + ly / 720 * r.height]; }, [lx, ly]).then(([x, y]) => tap(x, y));
  await tap(420, 200); await P.waitForTimeout(300);
  ok('el celular queda como control táctil', await P.evaluate(() => TouchPad.active && APP.firstDev === 'touch'), await P.evaluate(() => APP.firstDev));
  await P.evaluate(() => APP.go('online'));
  await waitFor(P, () => Net.hosts().some(h => !h.sameTab), 6000);
  await tapL(640, 200 + 70 + 29); await P.waitForTimeout(900);
  ok('entra como invitado tocando la sala', await P.evaluate(() => APP.screen) === 'netroom' && await P.evaluate(() => Net.localDev) === 'touch', await P.evaluate(() => APP.screen + ' ' + Net.localDev));
  await P.evaluate(() => { const r = APP.cardRect(2); window.__c = [r.x + r.w / 2, r.y + r.h / 2]; }); await tapL(...await P.evaluate(() => window.__c)); await P.waitForTimeout(700);
  ok('elige personaje tocando su tarjeta', await waitFor(A, () => APP.slots.some(s => s.remote && s.ready), 5000), await A.evaluate(() => APP.slots.map(s => s.type + ':' + (s.pick || '-')).join(' ')));
  // la voz en el celular: sin cámara ni franja de caras
  await P.evaluate(() => AV.start()); await A.evaluate(() => AV.start());
  await waitFor(P, () => AV.on, 6000);
  const pav = await P.evaluate(() => ({ video: AV.stream ? AV.stream.getVideoTracks().length : -1, w: AV.stream && AV.stream.getVideoTracks()[0] ? AV.stream.getVideoTracks()[0].getSettings().width : 0, bar: window.AV_BAR || 0 }));
  ok('en celular: cámara chica y sin franja de caras', pav.video === 1 && pav.w <= 200 && pav.bar === 0, JSON.stringify(pav));
  ok('se conectan por voz', await waitFor(P, () => AV.count() === 1, 15000), await P.evaluate(() => [...AV.pcs.values()].map(r => r.pc.connectionState).join(',')));
  ok('el celular recibe la cara de Ana', await waitFor(P, () => !!AV.videoFor(Net.hostPeer), 10000));
  // pelea: Ana arranca; en el celular aparecen los controles y la palanca mueve al invitado
  await key(A, 'Enter', 400); await key(A, 'Enter', 800);
  await waitFor(A, () => APP.screen === 'battle' && BATTLE && BATTLE.phase === 'fight', 10000);
  await waitFor(P, () => APP.screen === 'netview' && !!Net.lastSnap, 6000);
  ok('invitado en el celular: se ven la palanca y los botones', await P.evaluate(() => TouchPad.shown()), await P.evaluate(() => APP.screen));
  ok('en el celular el marcador va arriba, con las caras', await P.evaluate(() => { let ys = []; const o = window.drawVideoCover; window.drawVideoCover = function (c, v, x, y) { ys.push(y); return o.apply(this, arguments); }; Net.view.drawHUD(); window.drawVideoCover = o; return ys.length === 2 && ys.every(y => y < 100); }), await P.evaluate(() => hudOnTop()));
  ok('en la compu el marcador sigue abajo', await A.evaluate(() => !hudOnTop()));
  const gx0 = await A.evaluate(() => BATTLE.fighters[1].x);
  await P.evaluate(() => { const y = innerHeight - 90, ps = (t, x) => (document.elementFromPoint(x, y) || document.body).dispatchEvent(new PointerEvent(t, { pointerId: 61, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true })); ps('pointerdown', 20); for (let k = 1; k <= 6; k++) ps('pointermove', 20 - k * 10); window.__up = () => ps('pointerup', -40); });
  await P.waitForTimeout(900);
  const gx1 = await A.evaluate(() => BATTLE.fighters[1].x);
  ok('la palanca táctil del invitado lo mueve (visto por el anfitrión)', gx1 < gx0 - 40, `${Math.round(gx0)} → ${Math.round(gx1)}`);
  await P.evaluate(() => window.__up());
  const J = await P.evaluate(() => { const b = TouchPad.L.btns.find(b => b.a === 'jump'); return [b.x, b.y]; });
  await P.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y) || document.body; el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 62, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true })); }, J);
  const jumped = await waitFor(A, () => !BATTLE.fighters[1].grounded, 2000);
  await P.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y) || document.body; el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 62, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true })); }, J);
  ok('el botón Saltar del invitado salta', jumped);
  // Safari deja el audio "interrumpido" al abrir el micrófono: un toque lo retoma
  const resumed = await P.evaluate(async () => { const c = Audio8.ctx; const orig = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state'); let fake = 'interrupted'; Object.defineProperty(c, 'state', { get: () => fake === 'interrupted' ? 'interrupted' : orig.get.call(c), configurable: true }); const r0 = c.resume.bind(c); let called = false; c.resume = () => { called = true; fake = 'running'; return r0(); }; Audio8.unlock(); delete c.state; return called; });
  ok('audio "interrumpido" (micrófono en iPhone): se retoma', resumed);
  await P.evaluate(() => render()); await P.screenshot({ path: 'shots/look/mobile-guest.png' });
  console.log(`\n${pass} OK · ${fail} FAIL`); console.log('ERRORS', errs.length, [...new Set(errs)].slice(0, 6).join('\n'));
  await browser.close(); srv.kill(); process.exit(fail || errs.length ? 1 : 0);
})();
