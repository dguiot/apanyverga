// Cámara y voz: dos jugadores en una sala se ven y se escuchan (cámara falsa de Chromium).
// Sin franja aparte: la cara de cada quien va en su tarjeta y, en la pelea, en su cuadrito del marcador.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8767'], { cwd: process.cwd(), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-features=WebRtcHideLocalIpsWithMdns', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['camera', 'microphone'] });
  await ctx.addInitScript({ path: 'mockroom.js' });
  const errs = []; let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const mk = async name => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' ' + m.text().slice(0, 200)); }); await p.goto('http://localhost:8767/' + (process.env.PAGE || 'index.html')); return p; };
  const A = await mk('A'); await A.evaluate(() => localStorage.clear()); await A.reload();
  const B = await mk('B'); await A.waitForTimeout(1200);
  const key = async (p, k, wait = 200) => { await p.keyboard.down(k); await p.waitForTimeout(50); await p.keyboard.up(k); await p.waitForTimeout(wait); };
  const waitFor = async (p, fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(150); } return false; };
  // sala: A crea, B entra
  await key(A, 'Enter', 300); await key(A, 'KeyS'); await key(A, 'Enter', 500); await key(A, 'Enter', 400); await key(A, 'Enter', 400);
  await key(B, 'Enter', 300); await key(B, 'KeyS'); await key(B, 'Enter', 1200); await key(B, 'KeyS'); await key(B, 'Enter', 900);
  ok('sala armada', await A.evaluate(() => APP.screen) === 'charsel' && await B.evaluate(() => APP.screen) === 'netroom');
  ok('el botón aparece en la sala', await A.evaluate(() => avButtonShown()) && await B.evaluate(() => avButtonShown()));
  // A enciende con un clic en el botón del juego
  const clickBtn = async p => { const b = await p.evaluate(() => { const r = canvas.getBoundingClientRect(); return { x: r.left + (AV_BTN.x + AV_BTN.w / 2) / 1280 * r.width, y: r.top + (AV_BTN.y + AV_BTN.h / 2) / 720 * r.height }; }); await p.mouse.click(b.x, b.y); };
  await clickBtn(A);
  ok('A: cámara y voz encendidas', await waitFor(A, () => AV.on && AV.stream && AV.stream.getVideoTracks().length === 1 && AV.stream.getAudioTracks().length === 1));
  ok('A: sin franja: el juego conserva todo su tamaño', await A.evaluate(() => (window.AV_BAR || 0) === 0 && Math.abs(canvas.getBoundingClientRect().height - Math.min(innerHeight, innerWidth * 720 / 1280)) < 3), await A.evaluate(() => `canvas ${Math.round(canvas.getBoundingClientRect().height)} de ${innerHeight}`));
  await clickBtn(B);
  const conn = await waitFor(A, () => AV.count() === 1, 15000) && await waitFor(B, () => AV.count() === 1, 8000);
  ok('A y B conectados directo', conn, `${await A.evaluate(() => [...AV.pcs.values()].map(r => r.pc.connectionState))} / ${await B.evaluate(() => [...AV.pcs.values()].map(r => r.pc.connectionState))}`);
  const seen = await waitFor(B, () => { const v = AV.videoFor(Net.hostPeer); return v && v.v.srcObject && v.v.srcObject.getAudioTracks().length === 1; }, 10000);
  ok('B ve el video de A y recibe su audio', seen, await B.evaluate(() => [...document.querySelectorAll('#av video')].map(v => `${v.muted ? 'yo' : 'otro'}:${v.videoWidth}x${v.videoHeight}:audio${v.srcObject ? v.srcObject.getAudioTracks().length : 0}`).join(' | ')));
  ok('A ve el video de B', await waitFor(A, () => !!AV.videoFor(APP.slots.find(s => s.remote).remote), 8000));
  // la cara va en la tarjeta de cada quien al elegir personaje
  const onCard = async p => p.evaluate(() => { let n = 0; const o = window.drawVideoCover; window.drawVideoCover = function () { n++; return o.apply(this, arguments); }; render(); window.drawVideoCover = o; return n; });
  ok('A ve su cara y la de B en sus tarjetas', await onCard(A) === 2, await onCard(A));
  ok('B ve su cara y la de A en sus tarjetas', await onCard(B) === 2, await onCard(B));
  ok('las señales caben en la sala (<4 KiB por mensaje)', (await A.evaluate(() => window.__emitMax)) < 4096, await A.evaluate(() => `${window.__emitMax} bytes, ${window.__emits} mensajes`));
  // el botón del juego prendido se parte en micrófono · cámara · salir
  const clickSeg = async (p, k) => { const b = await p.evaluate(k => { const q = AV.segs(AV_BTN)[k], r = canvas.getBoundingClientRect(); return { x: r.left + (q.x + q.w / 2) / 1280 * r.width, y: r.top + (q.y + q.h / 2) / 720 * r.height }; }, k); await p.mouse.click(b.x, b.y); await p.waitForTimeout(250); };
  await clickSeg(A, 0);
  ok('silenciar micrófono (🎤 en el botón)', await A.evaluate(() => !AV.mic && AV.stream.getAudioTracks()[0].enabled === false));
  await clickSeg(A, 0);
  await key(A, 'KeyM', 200);
  ok('M también silencia', await A.evaluate(() => !AV.mic));
  await key(A, 'KeyM', 200);
  ok('Espacio sigue siendo del juego', await A.evaluate(() => document.activeElement.tagName !== 'BUTTON'), await A.evaluate(() => document.activeElement.tagName));
  await A.screenshot({ path: 'shots/v1-host-room-av.png' });
  // a pelear con la franja puesta
  await key(A, 'KeyJ', 300); await key(B, 'KeyJ', 800); await key(A, 'Enter', 400); await key(A, 'Enter', 900);
  await waitFor(A, () => APP.screen === 'battle' && BATTLE.phase === 'fight', 10000);
  await B.waitForTimeout(1500);
  ok('en la pelea la conexión sigue', await A.evaluate(() => AV.count() === 1) && await B.evaluate(() => AV.count() === 1));
  // en el marcador, la cara sustituye al retrato del personaje de cada quien
  const hudCams = p => p.evaluate(() => { let n = 0; const o = window.drawVideoCover; window.drawVideoCover = function () { n++; return o.apply(this, arguments); }; const B = BATTLE || Net.view; if (B) B.drawHUD(); window.drawVideoCover = o; return n; });
  ok('A: en el marcador salen las dos caras', await waitFor(A, () => { let n = 0; const o = window.drawVideoCover; window.drawVideoCover = function () { n++; return o.apply(this, arguments); }; BATTLE.drawHUD(); window.drawVideoCover = o; return n === 2; }, 6000), await hudCams(A));
  ok('B: en el marcador salen las dos caras', await waitFor(B, () => { let n = 0; const o = window.drawVideoCover; window.drawVideoCover = function () { n++; return o.apply(this, arguments); }; if (Net.view) Net.view.drawHUD(); window.drawVideoCover = o; return n === 2; }, 6000), await hudCams(B));
  // cámara apagada: vuelve el retrato del personaje
  await A.evaluate(() => AV.setCam(false));
  ok('A apaga su cámara: en B vuelve su retrato', await waitFor(B, () => !AV.videoFor(Net.hostPeer), 5000));
  await A.evaluate(() => AV.setCam(true));
  await B.bringToFront(); await B.waitForTimeout(800);
  await B.screenshot({ path: 'shots/v2-guest-battle-av.png' });
  // B apaga: A deja de verlo
  await B.evaluate(() => AV.stop(true));
  ok('B apaga su cámara y voz', await B.evaluate(() => !AV.on && !document.getElementById('av')));
  ok('A deja de ver a B', await waitFor(A, () => AV.pcs.size === 0 && document.querySelectorAll('#av video').length === 1, 6000));
  // permiso negado por la sala (nivel sin permiso para enviar)
  const C = await mk('C'); await C.evaluate(() => { window.__emitDenied = true; }); await C.waitForTimeout(800);
  await key(C, 'Enter', 300); await key(C, 'KeyS'); await key(C, 'Enter', 1200); await key(C, 'KeyS'); await key(C, 'Enter', 900);
  await C.evaluate(() => AV.start()); await C.waitForTimeout(2500);
  ok('sin permiso de envío: se apaga y explica por qué', await C.evaluate(() => !AV.on && /permiso/.test(AV.err || '')), await C.evaluate(() => AV.err));
  // cámara bloqueada por el navegador
  const D = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await D.addInitScript({ path: 'mockroom.js' });
  await D.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })); });
  const Dp = await D.newPage(); await Dp.goto('http://localhost:8767/index.html'); await Dp.waitForTimeout(900);
  await key(Dp, 'Enter', 300); await key(Dp, 'KeyS'); await key(Dp, 'Enter', 500); await key(Dp, 'Enter', 400);
  await Dp.evaluate(() => AV.start()); await Dp.waitForTimeout(500);
  ok('cámara bloqueada: mensaje claro y el juego sigue', await Dp.evaluate(() => !AV.on && !!AV.err && APP.screen === 'modesel'), await Dp.evaluate(() => AV.err));
  await Dp.evaluate(() => render()); await Dp.screenshot({ path: 'shots/v3-av-blocked.png' });
  console.log(`\n${pass} OK · ${fail} FAIL`);
  console.log('ERRORS', errs.length, '\n' + [...new Set(errs)].slice(0, 10).join('\n'));
  await browser.close(); srv.kill();
})();
