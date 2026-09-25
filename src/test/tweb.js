// Versión web (GitHub Pages) de punta a punta con un Supabase simulado:
// nombre al entrar al online, salas, pelea por conexión directa (DataChannel), resultados,
// salón de la fama en la tabla, y respaldo por el canal cuando no se puede conectar directo.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8768'], { cwd: process.cwd() + '/web', stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript({ path: 'mocksupa.js' });
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.APYV_CONFIG = { client: window.__mockClient, ice: [] };' }));
  const errs = [];
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const mk = async (name, init) => {
    const p = await ctx.newPage();
    if (init) await p.addInitScript(init);
    p.on('pageerror', e => errs.push(name + ' ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    p.on('console', m => { if (m.type() === 'error') errs.push(name + ' ' + m.text().slice(0, 200)); });
    p.on('dialog', d => d.accept(name));
    await p.goto('http://localhost:8768/index.html');
    return p;
  };
  const key = async (p, k, wait = 180) => { await p.keyboard.down(k); await p.waitForTimeout(50); await p.keyboard.up(k); await p.waitForTimeout(wait); };
  const scr = p => p.evaluate(() => APP.screen);
  const waitFor = async (p, fn, arg, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await p.waitForTimeout(100); } return false; };

  const A = await mk('Ana');
  await A.evaluate(() => localStorage.clear()); await A.reload(); await A.waitForTimeout(400);
  ok('versión web: se instala el adaptador de Supabase', await A.evaluate(() => window.APYV_WEB === true && window.claude && window.claude.web === true));
  ok('versión web: con las fotos de las caras', await A.evaluate(() => typeof FACE_DATA !== 'undefined' && Object.keys(FACE_IMG).length === 5), await A.evaluate(() => Object.keys(FACE_IMG).join(',')));
  ok('versión web: título y viewport para celular', await A.evaluate(() => document.title === 'A pan y verga' && !!document.querySelector('meta[name=viewport]')));
  const B = await mk('Beto');
  await A.waitForTimeout(800);
  // ---- A crea la sala
  await key(A, 'Enter', 300); await key(A, 'KeyS'); await key(A, 'Enter', 700);
  ok('al entrar al online pregunta el nombre', await A.evaluate(() => Net.user && Net.user.name() === 'Ana'), await A.evaluate(() => Net.user && Net.user.name()));
  ok('conectado a la sala', await waitFor(A, () => Net.ok && Net.conn, null, 4000));
  await key(A, 'Enter', 400);
  ok('anfitrión: crear sala abre la selección de modo', await scr(A) === 'modesel', await scr(A));
  await key(A, 'Enter', 400); await key(A, 'KeyJ', 300);
  ok('anfitrión en la sala', await scr(A) === 'charsel', await scr(A));
  // ---- B entra
  await key(B, 'Enter', 300); await key(B, 'KeyS'); await key(B, 'Enter', 1200);
  const hostsB = await B.evaluate(() => Net.hosts().filter(h => !h.sameTab).map(h => Net.nameOf(h.peer)));
  ok('el invitado ve la sala de Ana', hostsB.some(n => n === 'Ana'), JSON.stringify(hostsB));
  await key(B, 'KeyS'); await key(B, 'Enter', 900);
  ok('invitado: entra a la sala', await scr(B) === 'netroom', await scr(B));
  const ch0 = await B.evaluate(() => Net.guest.ch), N = await B.evaluate(() => NCH() + 1);
  for (let i = 0; i < (7 - ch0 + N) % N; i++) await key(B, 'ArrowRight', 90);
  await key(B, 'KeyJ', 900);
  const slotsA = await A.evaluate(() => APP.slots.map(s => s.type === 'none' ? '-' : `${s.type}:${s.pick || s.cur}${s.remote ? ':R:' + s.name : ''}`).join(' '));
  ok('anfitrión ve a Beto listo con Michi', slotsA.includes('michi:R:Beto'), slotsA);
  // conexión directa lista antes de pelear
  ok('conexión directa (DataChannel) abierta', await waitFor(B, () => { const d = Net.room._debug(); return d.links.length === 1 && d.links[0][1] === 'open'; }, null, 6000), JSON.stringify(await B.evaluate(() => Net.room._debug().links)));
  // ---- pelea
  await key(A, 'Enter', 400); await key(A, 'Enter', 800);
  const inBattle = await waitFor(A, () => APP.screen === 'battle' && BATTLE && BATTLE.phase === 'fight', null, 9000);
  await waitFor(B, () => APP.screen === 'netview' && !!Net.lastSnap, null, 5000);
  ok('pelea en marcha en ambos', inBattle && await scr(B) === 'netview', `${await scr(A)} / ${await scr(B)}`);
  const fast0 = await A.evaluate(() => window.__mockStats.bcPfast), fastB0 = await B.evaluate(() => window.__mockStats.bcPfast);
  const gx0 = await A.evaluate(() => BATTLE.fighters[1].x);
  await B.keyboard.down('ArrowLeft'); await B.waitForTimeout(600); await B.keyboard.up('ArrowLeft'); await B.waitForTimeout(200);
  const gx1 = await A.evaluate(() => BATTLE.fighters[1].x);
  ok('el invitado se mueve con ← (visto por el anfitrión)', gx1 < gx0 - 40, `${Math.round(gx0)} → ${Math.round(gx1)}`);
  const snaps0 = await B.evaluate(() => Net.lastSnap && Net.lastSnap.g[3]); await B.waitForTimeout(1000); const snaps1 = await B.evaluate(() => Net.lastSnap && Net.lastSnap.g[3]);
  ok('al invitado le llega la pelea ~30 veces por segundo', snaps1 - snaps0 > 40, `${snaps1 - snaps0} cuadros en 1 s`);
  const fast1 = await A.evaluate(() => window.__mockStats.bcPfast), fastB1 = await B.evaluate(() => window.__mockStats.bcPfast);
  ok('lo rápido va directo, no por el canal de Supabase', fast1 - fast0 <= 2 && fastB1 - fastB0 <= 2, `anfitrión ${fast1 - fast0} · invitado ${fastB1 - fastB0} mensajes rápidos por el canal en ~2 s de pelea`);
  await B.screenshot({ path: 'shots/w1-guest-battle.png' });
  // ---- se decide
  await A.evaluate(() => { const g = BATTLE.fighters[1]; g.stocks = 1; g.ko(); });
  const res = await waitFor(A, () => APP.screen === 'results', null, 8000) && await waitFor(B, () => APP.screen === 'results', null, 5000);
  ok('resultados en ambos', res, `${await scr(A)} / ${await scr(B)}`);
  const saved = await waitFor(A, () => JSON.parse(localStorage.getItem('__mock_sb_apyv_docs') || '[]').length >= 1, null, 6000);
  const doc = await A.evaluate(() => JSON.parse(localStorage.getItem('__mock_sb_apyv_docs') || '[]')[0]);
  ok('la pelea quedó en la tabla (por cuenta, sin nombres)', saved && doc.coll === 'matches' && doc.body.players.length === 2 && doc.body.players[0].uid !== doc.body.players[1].uid && !('name' in doc.body.players[0]), JSON.stringify(doc && doc.body.players.map(p => p.uid.slice(0, 8))));
  const players = await A.evaluate(() => JSON.parse(localStorage.getItem('__mock_sb_apyv_players') || '[]').map(p => p.name).sort().join(','));
  ok('los nombres quedaron en apyv_players', players === 'Ana,Beto', players);
  // ---- salón de la fama
  await A.evaluate(() => APP.go('fame'));
  await waitFor(A, () => Fame.rows && Fame.rows.length === 2 && Object.keys(Fame.profiles).length === 2, null, 6000);
  const fa = await A.evaluate(() => Fame.rows.map(r => `${Fame.nameOf(r.uid)}:${r.wins}/${r.games}${Fame.isMe(r.uid) ? '*' : ''}`).join(' | '));
  ok('salón: Ana y Beto con su récord (y quién soy)', /Ana:1\/1\*/.test(fa) && /Beto:0\/1/.test(fa), fa);
  await A.screenshot({ path: 'shots/w2-fame.png' });
  await A.evaluate(() => APP.go('main')); await B.evaluate(() => { Net.leave(); APP.go('main'); });

  // ---- sin conexión directa (la red no deja): la pelea sigue por el canal, más lenta
  const C = await mk('Caro', () => { window.RTCPeerConnection = undefined; });
  await A.waitForTimeout(600);
  await A.evaluate(() => { Net.leave(); APP.go('online'); APP.onSel = 0; });
  await A.waitForTimeout(300); await key(A, 'Enter', 400); await key(A, 'Enter', 400); await key(A, 'KeyJ', 300);
  await C.evaluate(() => { APP.firstDev = 'kb1'; APP.go('online'); });
  await waitFor(C, () => Net.hosts().some(h => !h.sameTab), null, 5000);
  await C.evaluate(() => { APP.onSel = 1; }); await key(C, 'Enter', 900); await key(C, 'KeyJ', 900);
  ok('sin DataChannel: el invitado entra igual', await scr(C) === 'netroom', await scr(C));
  await key(A, 'Enter', 400); await key(A, 'Enter', 800);
  await waitFor(A, () => APP.screen === 'battle' && BATTLE && BATTLE.phase === 'fight', null, 9000);
  const viaCanal = await waitFor(C, () => APP.screen === 'netview' && !!Net.lastSnap, null, 6000);
  const c0 = await C.evaluate(() => Net.lastSnap && Net.lastSnap.g[3]); await C.waitForTimeout(1000); const c1 = await C.evaluate(() => Net.lastSnap && Net.lastSnap.g[3]);
  ok('sin DataChannel: la pelea llega por el canal (≈10 por segundo)', viaCanal && c1 - c0 > 20, `${c1 - c0} cuadros en 1 s`);
  const cx0 = await A.evaluate(() => BATTLE.fighters[1].x);
  await C.keyboard.down('ArrowLeft'); await C.waitForTimeout(700); await C.keyboard.up('ArrowLeft'); await C.waitForTimeout(300);
  const cx1 = await A.evaluate(() => BATTLE.fighters[1].x);
  ok('sin DataChannel: los controles del invitado llegan', cx1 < cx0 - 30, `${Math.round(cx0)} → ${Math.round(cx1)}`);

  // ---- sin inicios anónimos en Supabase: el juego abre y el online avisa, sin tronar
  const D = await mk('Dani', () => { window.__noAnon = true; });
  await D.waitForTimeout(800);
  await D.evaluate(() => APP.go('fame')); await D.waitForTimeout(600);
  ok('sin sesión anónima: el salón se puede ver', await D.evaluate(() => !!Fame.db && APP.screen === 'fame'));

  console.log(`\n${pass} OK · ${fail} FAIL`);
  console.log('ERRORS', errs.length, '\n' + [...new Set(errs)].slice(0, 10).join('\n'));
  await browser.close(); srv.kill();
  process.exit(fail || errs.length ? 1 : 0);
})();
