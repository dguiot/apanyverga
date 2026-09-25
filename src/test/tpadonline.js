// En línea el control sirve aunque hayas entrado a la sala con el teclado o el mouse:
// cada pantalla tiene un solo jugador y juega con lo que agarre (control, teclado o pantalla).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8779'], { cwd: process.cwd(), stdio: 'ignore' });
  process.on('exit', () => { try { srv.kill(); } catch (e) { /* ya cerrado */ } }); // aunque la prueba truene: un servidor huérfano serviría código viejo
  process.on('uncaughtException', e => { console.log('FAIL excepción: ' + e.message); process.exit(1); });
  process.on('unhandledRejection', e => { console.log('FAIL excepción: ' + (e && e.message)); process.exit(1); });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript({ path: 'mockroom.js' });
  await ctx.addInitScript(() => {
    window.__pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [window.__pad, null, null, null];
  });
  const errs = [];
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const mk = async name => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ' ' + e.message));
    await p.goto('http://localhost:8779/' + (process.env.PAGE || 'index.html'));
    return p;
  };
  const A = await mk('A');
  await A.evaluate(() => localStorage.clear()); await A.reload();
  const B = await mk('B');
  await A.waitForTimeout(1200);
  const key = async (p, k, wait = 180) => { await p.keyboard.down(k); await p.waitForTimeout(50); await p.keyboard.up(k); await p.waitForTimeout(wait); };
  const btn = async (p, i, wait = 200) => { await p.evaluate(i => { window.__pad.buttons[i] = { pressed: true, touched: true, value: 1 }; }, i); await p.waitForTimeout(90); await p.evaluate(i => { window.__pad.buttons[i] = { pressed: false, touched: false, value: 0 }; }, i); await p.waitForTimeout(wait); };
  const axis = (p, x) => p.evaluate(x => { window.__pad.axes[0] = x; }, x);
  const scr = p => p.evaluate(() => APP.screen);
  const waitFor = async (p, fn, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(100); } return false; };

  // anfitrión: entra con el TECLADO (título → menú → Jugar online → Crear sala → modo)
  await key(A, 'Enter', 300); await key(A, 'KeyS'); await key(A, 'Enter', 500); await key(A, 'Enter', 400); await key(A, 'Enter', 400);
  ok('anfitrión en su sala (entró con teclado)', await scr(A) === 'charsel', await scr(A));
  // …y elige personaje con el CONTROL: → → y A
  const c0 = await A.evaluate(() => APP.slots[0].cur);
  await btn(A, 15); await btn(A, 15);
  const c1 = await A.evaluate(() => APP.slots[0].cur);
  ok('anfitrión: la cruceta del control mueve su cursor', c1 === (c0 + 2) % (await A.evaluate(() => NCH() + 1)), `${c0} → ${c1}`);
  await btn(A, 0, 300);
  ok('anfitrión: A del control lo deja listo', await A.evaluate(() => APP.slots[0].ready));
  // invitado: entra con el TECLADO
  await key(B, 'Enter', 300); await key(B, 'KeyS'); await key(B, 'Enter', 1200); await key(B, 'KeyS'); await key(B, 'Enter', 900);
  ok('invitado en la sala (entró con teclado)', await scr(B) === 'netroom', await scr(B));
  await btn(B, 0, 900); // listo con el control
  ok('invitado: A del control lo deja listo', await B.evaluate(() => !!Net.guest.rdy));
  // el anfitrión arranca con Start del control y confirma el escenario con A
  await btn(A, 9, 500); await btn(A, 0, 800);
  const inBattle = await waitFor(A, () => APP.screen === 'battle' && BATTLE && BATTLE.phase === 'fight');
  await waitFor(B, () => APP.screen === 'netview' && !!Net.lastSnap, 6000);
  ok('pelea en marcha', inBattle && await scr(B) === 'netview', `${await scr(A)} / ${await scr(B)}`);
  // el anfitrión camina con la palanca del control
  const hx0 = await A.evaluate(() => BATTLE.fighters[0].x);
  await axis(A, 1); await A.waitForTimeout(600); await axis(A, 0); await A.waitForTimeout(200);
  const hx1 = await A.evaluate(() => BATTLE.fighters[0].x);
  ok('anfitrión: se mueve con la palanca del control', hx1 > hx0 + 40, `${Math.round(hx0)} → ${Math.round(hx1)}`);
  // el invitado camina con la palanca de SU control (visto por el anfitrión)
  const gx0 = await A.evaluate(() => BATTLE.fighters[1].x);
  await axis(B, -1); await B.waitForTimeout(700); await axis(B, 0); await B.waitForTimeout(300);
  const gx1 = await A.evaluate(() => BATTLE.fighters[1].x);
  ok('invitado: se mueve con la palanca de su control', gx1 < gx0 - 40, `${Math.round(gx0)} → ${Math.round(gx1)}`);
  // y el teclado le sigue sirviendo a los dos
  const kx0 = await A.evaluate(() => BATTLE.fighters[1].x);
  await B.keyboard.down('ArrowRight'); await B.waitForTimeout(600); await B.keyboard.up('ArrowRight'); await B.waitForTimeout(300);
  const kx1 = await A.evaluate(() => BATTLE.fighters[1].x);
  ok('invitado: el teclado también sirve', kx1 > kx0 + 40, `${Math.round(kx0)} → ${Math.round(kx1)}`);
  // pausa con Start del control del anfitrión
  await btn(A, 9, 300);
  ok('anfitrión: Start del control pausa', await A.evaluate(() => !!BATTLE.paused));
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close(); srv.kill(); process.exit(fail ? 1 : 0);
})();
