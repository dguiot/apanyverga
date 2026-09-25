// Pantalla táctil: se activa al tocar, la palanca aparece donde pones el pulgar (también fuera del cuadro del juego),
// cinco botones en abanico que no se enciman y caben en un teléfono horizontal
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const VW = +(process.env.VW || 844), VH = +(process.env.VH || 390); // teléfono de lado
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(500);
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => {
    window.__steps = n => { for (let i = 0; i < n; i++) step(); };
    // toque en coordenadas del juego (sobre el cuadro) o de pantalla (en cualquier lugar)
    window.__pt = (type, id, lx, ly) => {
      const r = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: r.left + lx / 1280 * r.width, clientY: r.top + ly / 720 * r.height, bubbles: true, cancelable: true }));
    };
    window.__ps = (type, id, x, y) => {
      const el = document.elementFromPoint(x, y) || document.body;
      el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    };
    window.__btn = a => TouchPad.L.btns.find(b => b.a === a);
    __steps(5);
  });
  // tocar la pantalla de título
  await ev(() => { __pt('pointerdown', 1, 640, 400); __steps(1); __pt('pointerup', 1, 640, 400); __steps(3); });
  ok('el primer toque activa los controles táctiles', await ev(() => TouchPad.active));
  ok('y avanza al menú', await ev(() => APP.screen) === 'main', await ev(() => APP.screen));
  ok('quien tocó queda como jugador táctil', await ev(() => APP.firstDev) === 'touch', await ev(() => APP.firstDev));
  ok('aparece como dispositivo', await ev(() => Devices.list.includes('touch')));
  // pelea con el control táctil
  await ev(() => {
    APP.startBattle({ players: [{ port: 0, char: 'nacho', dev: 'touch' }, { port: 1, char: 'pablo', cpu: 1 }], stage: 'temple', rules: { mode: 'stock', stocks: 3, items: 0 } });
    BATTLE.stage.update = () => {};
    for (let i = 0; i < 400 && BATTLE.phase !== 'fight'; i++) step();
    const [a, b] = BATTLE.fighters; a.x = -200; b.x = 300; b.brain = null; b.ctrl = new Controller('quieto'); // rival quieto: la prueba no depende de la CPU
    __steps(20);
  });
  ok('se ven la palanca y los botones', await ev(() => TouchPad.shown()));
  // el juego es 16:9 y el teléfono más alargado: quedan franjas a los lados, justo donde descansan los pulgares
  const bars = await ev(() => { const r = canvas.getBoundingClientRect(); return { left: Math.round(r.left), vw: innerWidth }; });
  ok('en un teléfono alargado quedan franjas a los lados del juego', bars.left > 20, JSON.stringify(bars));
  const x0 = await ev(() => BATTLE.fighters[0].x);
  // pulgar en la franja izquierda, fuera del cuadro del juego
  await ev(() => { const y = innerHeight - 90; __ps('pointerdown', 5, 14, y); __steps(1); for (let k = 1; k <= 5; k++) { __ps('pointermove', 5, 14 + k * 9, y); __steps(1); } __steps(30); });
  const x1 = await ev(() => BATTLE.fighters[0].x);
  ok('la palanca aparece donde pones el pulgar, aunque sea en la franja', x1 > x0 + 30, `${x0.toFixed(0)} → ${x1.toFixed(0)}`);
  const followed = await ev(() => { const y = innerHeight - 90; __ps('pointermove', 5, 260, y); __steps(1); return Math.round(TouchPad.stick.cx); });
  ok('si el dedo se va lejos, la palanca lo sigue', followed > 100, followed);
  await ev(() => { __ps('pointerup', 5, 260, innerHeight - 90); __steps(20); });
  ok('soltar la palanca lo detiene', await ev(() => Math.abs(BATTLE.fighters[0].vx) < 1.5), await ev(() => BATTLE.fighters[0].vx.toFixed(2)));
  // botones: cinco, dentro de la pantalla, sin encimarse, A el más grande
  const lay = await ev(() => { const L = TouchPad.L; return { n: L.btns.length, acts: L.btns.map(b => b.a).join(','), inside: L.btns.every(b => b.x - b.rr >= 0 && b.x + b.rr <= L.vw && b.y - b.rr >= 0 && b.y + b.rr <= L.vh), minGap: Math.round(Math.min(...L.btns.flatMap((a, i) => L.btns.slice(i + 1).map(b => Math.hypot(a.x - b.x, a.y - b.y) - a.rr - b.rr)))), biggest: L.btns.reduce((a, b) => b.rr > a.rr ? b : a).a, aR: Math.round(__btn('attack').rr), rightHalf: L.btns.every(b => b.x > L.vw * 0.5) }; });
  ok('cinco botones: A, B, Saltar, Escudo y Agarrar', lay.n === 5 && lay.acts === 'attack,special,jump,shield,grab', lay.acts);
  ok('caben en la pantalla, del lado derecho, sin encimarse', lay.inside && lay.rightHalf && lay.minGap >= 8, `separación mínima ${lay.minGap}px`);
  ok('A es el más grande y se atina fácil (≥ 40px de radio)', lay.biggest === 'attack' && lay.aR >= 40, lay.aR + 'px');
  // botón A mientras la palanca sigue presionada (dos dedos a la vez)
  await ev(() => { const y = innerHeight - 90, A = __btn('attack'); __ps('pointerdown', 7, 60, y); __ps('pointermove', 7, 70, y); __steps(2); __ps('pointerdown', 8, A.x, A.y); __steps(2); });
  ok('dos dedos: palanca + A = ataque', await ev(() => BATTLE.fighters[0].state === 'attack'), await ev(() => BATTLE.fighters[0].state + ' ' + (BATTLE.fighters[0].move && BATTLE.fighters[0].move.key)));
  await ev(() => { const A = __btn('attack'); __ps('pointerup', 8, A.x, A.y); __ps('pointerup', 7, 70, innerHeight - 90); __steps(40); });
  await ev(() => { const J = __btn('jump'); __ps('pointerdown', 9, J.x, J.y); __steps(3); __ps('pointerup', 9, J.x, J.y); __steps(4); });
  ok('botón Saltar salta', await ev(() => !BATTLE.fighters[0].grounded), await ev(() => BATTLE.fighters[0].state));
  await ev(() => { __steps(60); const G = __btn('grab'), [a, b] = BATTLE.fighters; b.x = a.x + 40 * a.face; b.y = a.y; b.grounded = true; b.setState('idle'); __ps('pointerdown', 11, G.x, G.y); __steps(2); });
  ok('botón Agarrar agarra', await ev(() => ['attack', 'holding'].includes(BATTLE.fighters[0].state) && (BATTLE.fighters[0].state === 'holding' || /grab/.test(BATTLE.fighters[0].move && BATTLE.fighters[0].move.key))), await ev(() => BATTLE.fighters[0].state + ' ' + (BATTLE.fighters[0].move && BATTLE.fighters[0].move.key)));
  await ev(() => { const G = __btn('grab'); __ps('pointerup', 11, G.x, G.y); __steps(90); });
  await ev(() => { const P = TouchPad.L.pause; __ps('pointerdown', 10, P.x, P.y); __steps(2); __ps('pointerup', 10, P.x, P.y); __steps(2); });
  ok('botón de pausa pausa', await ev(() => BATTLE.paused));
  await ev(() => { BATTLE.paused = false; __ps('pointerdown', 12, 90, innerHeight - 120); __ps('pointermove', 12, 120, innerHeight - 110); const A = __btn('attack'); __ps('pointerdown', 13, A.x, A.y); render(); });
  await page.screenshot({ path: 'shots/look/touch-battle.png' });
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' || '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
