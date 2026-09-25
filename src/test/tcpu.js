// Selección de personaje solo con teclado (o control): elegir, agregar CPUs, cambiarles personaje y nivel, quitarlas
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'super-golpazo.html')); await page.waitForTimeout(600);
  let pass = 0, fail = 0; const ok = (n, c, i) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${i !== undefined ? '  → ' + i : ''}`); };
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.down(k); await page.evaluate(() => { step(); step(); }); await page.keyboard.up(k); await page.evaluate(() => { for (let j = 0; j < 4; j++) step(); }); } };
  const st = () => page.evaluate(() => ({ scr: APP.screen, sl: APP.slots.map(s => s.type === 'none' ? '-' : `${s.type}:${s.ready ? s.pick : '?' + s.cur}${s.type === 'cpu' ? ':L' + s.level : ''}`), focus: APP.slots[0].focus, edit: APP.slots[0].edit }));
  await page.evaluate(() => { for (let i = 0; i < 10; i++) step(); APP.firstDev = 'kb1'; APP.slots = [{ type: 'human', dev: 'kb1', cur: 0, ready: false, edit: 0 }, { type: 'none' }, { type: 'none' }, { type: 'none' }]; APP.go('charsel'); for (let i = 0; i < 5; i++) step(); });
  await key('ArrowRight', 2); // flechas mueven al jugador de WASD cuando nadie se unió con ellas
  let s = await st(); ok('las flechas eligen personaje del J1', s.sl[0] === 'human:?2', JSON.stringify(s.sl));
  await key('KeyJ'); s = await st(); const third = await page.evaluate(() => CHAR_ORDER[2]); ok('J1 listo', s.sl[0] === 'human:' + third, JSON.stringify(s.sl));
  await key('KeyD'); await key('KeyJ'); s = await st();
  ok('→ y A en un lugar vacío agrega una CPU para elegirle personaje', s.sl[1].startsWith('cpu:?') && s.edit === 1, JSON.stringify(s));
  await key('KeyD', 3); await key('KeyW'); await key('KeyJ'); s = await st();
  ok('se le elige personaje y nivel y queda lista', /^cpu:[a-z]+:L6$/.test(s.sl[1]) && s.edit === 0 && s.focus === 1, JSON.stringify(s));
  const firstCpu = s.sl[1];
  await key('ArrowRight'); await key('KeyJ'); await key('KeyJ'); s = await st();
  ok('otra CPU en el siguiente lugar', s.sl[2].startsWith('cpu:') && !s.sl[2].includes('?'), JSON.stringify(s.sl));
  await key('KeyA'); await key('KeyS'); s = await st(); ok('↓ en una CPU baja su nivel', s.sl[1].endsWith(':L5'), s.sl[1]);
  await key('KeyJ'); await key('KeyD', 2); await key('KeyJ'); s = await st();
  ok('A en una CPU lista la vuelve a editar (cambia de personaje)', s.sl[1] !== firstCpu.replace(':L6', ':L5') && /^cpu:[a-z]+:L5$/.test(s.sl[1]), `${firstCpu} → ${s.sl[1]}`);
  await key('KeyD'); await key('KeyU'); s = await st(); ok('LB/RB (U) quita la CPU marcada', s.sl[2] === '-', JSON.stringify(s.sl));
  await key('KeyK'); s = await st(); ok('B regresa el cursor a tu lugar', s.focus === 0, s.focus);
  await page.screenshot({ path: 'shots/look/charsel-cpu.png' });
  await key('Enter'); s = await st(); ok('Start: a escoger escenario', s.scr === 'stagesel', s.scr);
  console.log(`${pass} OK, ${fail} FAIL`, 'errors', errs.slice(0, 3));
  await browser.close(); process.exit(fail || errs.length ? 1 : 0);
})();
