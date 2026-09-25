// Online de punta a punta (sala simulada): modos, 10 personajes, equipos, fiesta,
// resultados en ambos lados y el Salón de la fama por cuenta
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8766'], { cwd: process.cwd(), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript({ path: 'mockroom.js' });
  const errs = [];
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const mk = async name => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ' ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    p.on('console', m => { if (m.type() === 'error') errs.push(name + ' ' + m.text().slice(0, 200)); });
    await p.goto('http://localhost:8766/' + (process.env.PAGE || 'index.html'));
    return p;
  };
  const A = await mk('A');
  await A.evaluate(() => localStorage.clear());
  await A.reload();
  const B = await mk('B');
  await A.waitForTimeout(1200);
  const key = async (p, k, wait = 180) => { await p.keyboard.down(k); await p.waitForTimeout(50); await p.keyboard.up(k); await p.waitForTimeout(wait); };
  const scr = p => p.evaluate(() => APP.screen);
  const waitFor = async (p, fn, arg, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await p.waitForTimeout(100); } return false; };

  // ---- A crea la sala (título → menú → Jugar online → Crear sala → modo)
  await key(A, 'Enter', 300); await key(A, 'KeyS'); await key(A, 'Enter', 500); await key(A, 'Enter', 400);
  ok('anfitrión: crear sala abre la selección de modo', await scr(A) === 'modesel', await scr(A));
  await key(A, 'Enter', 400);
  ok('anfitrión: modo Vidas → sala', await scr(A) === 'charsel', await scr(A));
  await key(A, 'KeyJ', 300);
  // ---- B entra
  await key(B, 'Enter', 300); await key(B, 'KeyS'); await key(B, 'Enter', 1200);
  await key(B, 'KeyS'); await key(B, 'Enter', 900);
  ok('invitado: entra a la sala', await scr(B) === 'netroom', await scr(B));
  // B elige a Michi con las flechas (un solo teclado: las flechas sirven)
  const ch0 = await B.evaluate(() => Net.guest.ch), N = await B.evaluate(() => NCH() + 1), MI = await B.evaluate(() => CHAR_ORDER.indexOf('michi')); // la lista crece con cada personaje nuevo
  const steps = (MI - ch0 + N) % N;
  for (let i = 0; i < steps; i++) await key(B, 'ArrowRight', 90);
  await key(B, 'KeyJ', 900);
  const slotsA = await A.evaluate(() => APP.slots.map(s => s.type === 'none' ? '-' : `${s.type}:${s.pick || s.cur}${s.remote ? ':R' : ''}`).join(' '));
  ok('anfitrión ve al invitado listo con Michi', slotsA.includes('michi:R'), slotsA);
  await B.screenshot({ path: 'shots/o1-guest-room.png' });
  // ---- A arranca: Start → escenarios → pelear
  await key(A, 'Enter', 400); await key(A, 'Enter', 800);
  ok('ambos en VS', await scr(A) === 'vs' && await scr(B) === 'vs', `${await scr(A)} / ${await scr(B)}`);
  const inBattle = await waitFor(A, () => APP.screen === 'battle' && BATTLE && BATTLE.phase === 'fight', null, 9000);
  await waitFor(B, () => APP.screen === 'netview' && !!Net.lastSnap, null, 5000);
  ok('pelea en marcha en ambos', inBattle && await scr(B) === 'netview', `${await scr(A)} / ${await scr(B)}`);
  const uids = await A.evaluate(() => BATTLE.fighters.map(f => f.uid));
  ok('cada persona pelea con su cuenta (uid)', uids.every(u => typeof u === 'string' && u.startsWith('u_')) && uids[0] !== uids[1], JSON.stringify(uids));
  // el invitado se mueve con las flechas
  const gx0 = await A.evaluate(() => BATTLE.fighters[1].x);
  await B.keyboard.down('ArrowLeft'); await B.waitForTimeout(500); await B.keyboard.up('ArrowLeft'); await B.waitForTimeout(200);
  const gx1 = await A.evaluate(() => BATTLE.fighters[1].x);
  ok('el invitado se mueve con ← (visto por el anfitrión)', gx1 < gx0 - 40, `${Math.round(gx0)} → ${Math.round(gx1)}`);
  await B.screenshot({ path: 'shots/o2-guest-battle.png' });
  // el invitado ve el golpe del anfitrión con su pose exacta y su estela
  await A.evaluate(() => { const h = BATTLE.fighters[0]; h.move = null; h.setState('idle'); h.startMove('ftilt'); });
  const sawSwoosh = await waitFor(B, () => { const f = Net.view && Net.view.fighters[0]; return !!(f && f.move && f.move.key === 'ftilt' && f.swoosh && f.swoosh.lines.length); }, null, 3000);
  ok('el invitado ve el golpe del anfitrión con estela', sawSwoosh, await B.evaluate(() => { const f = Net.view.fighters[0]; return `${f.state} ${f.move && f.move.key} f=${f.move && f.move.f} swoosh=${!!f.swoosh}`; }));
  // ---- se decide la pelea: el invitado queda fuera
  await A.evaluate(() => { const g = BATTLE.fighters[1]; g.stocks = 1; g.ko(); });
  const res = await waitFor(A, () => APP.screen === 'results', null, 8000) && await waitFor(B, () => APP.screen === 'results', null, 5000);
  ok('resultados en ambos', res, `${await scr(A)} / ${await scr(B)}`);
  const rb = await B.evaluate(() => ({ w: APP.results.ranked[0].id, win: APP.results.ranked[0].win, mode: APP.results.mode }));
  const hostId = await A.evaluate(() => BATTLE ? BATTLE.fighters[0].id : APP.results.ranked.find(r => !r.cpu && r.port === 0).id);
  ok('el invitado ve al ganador correcto (último en pie)', rb.w === hostId && rb.win && rb.mode === 'stock', JSON.stringify(rb) + ' anfitrión=' + hostId);
  await waitFor(A, () => Object.keys(JSON.parse(localStorage.getItem('__mock_db') || '{}')).length >= 1, null, 4000);
  const doc1 = await A.evaluate(() => Object.values(JSON.parse(localStorage.getItem('__mock_db') || '{}'))[0]);
  ok('la pelea quedó guardada (por cuentas, sin nombres)', doc1 && doc1.players.length === 2 && doc1.players.every(p => p.uid.startsWith('u_') && !('name' in p)), JSON.stringify(doc1 && doc1.players));
  await B.screenshot({ path: 'shots/o3-guest-results.png' });

  // ---- revancha con el anfitrión sin permiso de escritura: la guarda el invitado
  await A.evaluate(() => { window.__dbReadOnly = true; });
  await A.waitForTimeout(800);
  await key(A, 'Enter', 600);
  await waitFor(A, () => APP.screen === 'battle' && BATTLE && BATTLE.phase === 'fight', null, 9000);
  await A.evaluate(() => { const h = BATTLE.fighters[0]; h.stocks = 1; h.ko(); });
  await waitFor(B, () => APP.screen === 'results', null, 9000);
  const saved2 = await waitFor(A, () => Object.keys(JSON.parse(localStorage.getItem('__mock_db') || '{}')).length >= 2, null, 9000);
  ok('revancha: si el anfitrión no puede guardar, el invitado la guarda', saved2 && await B.evaluate(() => window.__dbWrites === 1), await B.evaluate(() => window.__dbWrites));
  await A.evaluate(() => { window.__dbReadOnly = false; });

  // ---- tercera: por equipos con CPU y Modo Fiesta, en Fútbol
  await key(A, 'KeyK', 600); // a la sala
  ok('anfitrión vuelve a la sala', await scr(A) === 'charsel', await scr(A));
  await waitFor(B, () => APP.screen === 'netroom', null, 4000);
  await A.evaluate(() => { APP.rules.mode = 'soccer'; APP.rules.party = true; APP.rules.teams = true; });
  await key(A, 'KeyJ', 300); await key(A, 'Space', 300); // A listo + agrega CPU
  await key(A, 'KeyJ', 300); // CPU lista
  await A.waitForTimeout(600);
  await key(B, 'KeyJ', 300); // B listo (volvió sin listo)
  await key(B, 'KeyL', 600); // B cambia de equipo
  const teamsA = await A.evaluate(() => APP.slots.filter(s => s.type !== 'none').map(s => `${s.type}${s.remote ? 'R' : ''}:T${s.team}`).join(' '));
  ok('el invitado cambia de equipo desde su pantalla', /humanR:T[01]/.test(teamsA), teamsA);
  await B.screenshot({ path: 'shots/o4-guest-room-teams.png' });
  await key(A, 'Enter', 400); await key(A, 'Enter', 900);
  const setupB = await B.evaluate(() => APP.pendingSetup && { mode: APP.pendingSetup.rules.mode, teams: APP.pendingSetup.rules.teams, party: APP.pendingSetup.party, stage: APP.pendingSetup.stage, n: APP.pendingSetup.players.length });
  ok('el invitado recibe Fútbol + equipos + fiesta + Estadio', setupB && setupB.mode === 'soccer' && setupB.teams && setupB.party && setupB.stage === 'stadium' && setupB.n === 3, JSON.stringify(setupB));
  await waitFor(A, () => APP.screen === 'battle' && BATTLE && BATTLE.phase === 'fight', null, 9000);
  await waitFor(B, () => APP.screen === 'netview' && Net.view && Net.view.ms && Net.view.ms.ball, null, 6000);
  await B.waitForTimeout(1500);
  const vb = await B.evaluate(() => ({ ball: !!(Net.view.ms.ball), goals: Net.view.ms.goals, party: Net.view.party && Net.view.party.id, cols: Net.view.fighters.map(f => f.color) }));
  ok('el invitado ve la pelota, el marcador y los colores de equipo', vb.ball && Array.isArray(vb.goals) && vb.cols.every(c => c === '#e63946' || c === '#3a86ff'), JSON.stringify(vb));
  await B.screenshot({ path: 'shots/o5-guest-soccer.png' });
  await A.evaluate(() => { BATTLE.ms.goals = [SOCCER_TARGET, 1]; });
  await waitFor(B, () => APP.screen === 'results', null, 9000);
  const rb3 = await B.evaluate(() => ({ teams: APP.results.teams, winTeam: APP.results.winTeam, goals: APP.results.goals, party: APP.results.party }));
  ok('resultados por equipos en el invitado', rb3.teams && rb3.winTeam === 0 && rb3.goals && rb3.goals[0] === 5, JSON.stringify(rb3));
  await B.screenshot({ path: 'shots/o6-guest-results-teams.png' });
  await waitFor(A, () => Object.keys(JSON.parse(localStorage.getItem('__mock_db') || '{}')).length >= 3, null, 6000);

  // ---- Salón de la fama en ambos (nombres resueltos al dibujar)
  await A.evaluate(() => APP.go('fame')); await B.evaluate(() => { Net.leave(); APP.go('fame'); });
  await waitFor(A, () => Fame.rows && Fame.rows.length === 2 && Object.keys(Fame.profiles).length === 2, null, 5000);
  await waitFor(B, () => Fame.rows && Fame.rows.length === 2 && Object.keys(Fame.profiles).length === 2, null, 5000);
  const fa = await A.evaluate(() => Fame.rows.map(r => `${Fame.nameOf(r.uid)}:${r.wins}/${r.games}:${r.fav}:${r.title}`).join(' | '));
  const fb = await B.evaluate(() => Fame.rows.map(r => `${Fame.nameOf(r.uid)}:${r.wins}/${r.games}`).join(' | '));
  ok('salón: 2 cuentas, 3 peleas cada una, con nombres', /Ana|Beto/.test(fa) && fa.split(' | ').every(x => x.includes('/3')), fa);
  ok('salón: lo mismo visto por el invitado', fb === fa.split(' | ').map(x => x.split(':').slice(0, 2).join(':')).join(' | '), fb);
  await A.screenshot({ path: 'shots/o7-fame.png' });
  // sin db (archivo descargado): mensaje claro
  const C = await ctx.newPage(); await C.addInitScript(() => { window.__noDb = true; }); await C.goto('http://localhost:8766/index.html'); await C.waitForTimeout(900);
  await C.evaluate(() => APP.go('fame')); await C.waitForTimeout(400);
  ok('sin db: el salón explica dónde funciona', await C.evaluate(() => !Fame.db && APP.screen === 'fame'));
  await C.screenshot({ path: 'shots/o8-fame-nodb.png' });
  const presMax = await A.evaluate(() => window.__presMax);
  ok('presence del anfitrión < 4 KiB', presMax < 4096, presMax);

  console.log(`\n${pass} OK · ${fail} FAIL`);
  console.log('ERRORS', errs.length, '\n' + [...new Set(errs)].slice(0, 10).join('\n'));
  await browser.close(); srv.kill();
})();
