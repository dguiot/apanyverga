// Torneo en sala: el anfitrión publica cuadro, los invitados ven la ronda y un espectador recibe la pelea.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8793'], { cwd: process.cwd() + '/web', stdio: 'ignore' });
  process.on('exit', () => { try { srv.kill(); } catch (e) {} });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript({ path: 'mocksupa.js' });
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.APYV_CONFIG = { client: window.__mockClient, ice: [] };' }));
  const errors = [], checks = [];
  const ok = (name, pass, detail) => { checks.push(pass); console.log((pass ? 'OK  ' : 'FAIL') + name + (detail === undefined ? '' : ' → ' + detail)); };
  const mk = async name => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ': ' + e.message));
    p.on('dialog', d => d.accept(name));
    await p.goto('http://localhost:8793/index.html');
    return p;
  };
  const wait = async (p, fn, ms = 8000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(120); }
    return false;
  };
  const A = await mk('Ana'), B = await mk('Beto');
  ok('ambos tienen sala disponible', await wait(A, () => Net.ok && !!Net.myPeer()) && await wait(B, () => Net.ok && !!Net.myPeer()));
  const hostPeer = await A.evaluate(() => {
    Net.host();
    APP.slots = [{ type: 'human', dev: 'local', cur: 0, ready: true, pick: 'nacho', edit: 0 }, { type: 'none' }, { type: 'none' }, { type: 'none' }];
    APP.go('charsel');
    return Net.myPeer();
  });
  await B.evaluate(peer => { Net.join(peer); Net.guest.ch = CHAR_ORDER.indexOf('pablo'); Net.guest.rdy = 1; Net.set({ ch: Net.guest.ch, rdy: 1 }); APP.go('netroom'); }, hostPeer);
  ok('Beto aparece como participante', await wait(A, () => APP.slots.some(s => s.remote && s.ready), 10000));
  const peerB = await B.evaluate(() => Net.myPeer());
  await A.evaluate(peer => {
    const setup = {
      players: [
        { port: 0, char: 'nacho', dev: 'local', cpu: 0, remote: '', uid: Net.myId },
        { port: 1, char: 'pablo', dev: 'net:' + peer, cpu: 0, remote: peer, uid: Net.byOf(peer) },
      ],
      stage: 'temple', rules: { mode: 'stock', stocks: 2, items: 0, time: 3, teams: false, party: false },
    };
    Tourney.begin(setup);
  }, peerB);
  ok('el invitado ve el cuadro del torneo', await wait(B, () => APP.screen === 'tournament' && Tourney.active));
  const C = await mk('Cora');
  ok('el espectador tiene conexión', await wait(C, () => Net.ok && !!Net.myPeer()));
  await C.evaluate(peer => { Net.join(peer); APP.go('netroom'); }, hostPeer);
  ok('el espectador ve el cuadro', await wait(C, () => APP.screen === 'tournament' && Tourney.active));
  const ready = await wait(A, () => {
    const peer = Net.guestsOf(Net.myPeer()).find(p => p.presence.rdy)?.peer;
    return !!peer && Net.room.fastReady([peer]) && Net.presOf(peer)?.rbc === 1;
  }, 8000);
  ok('conexión directa lista para los jugadores', ready);
  await A.evaluate(() => Tourney.start());
  ok('los dos jugadores entran en la pelea', await wait(A, () => APP.screen === 'battle', 7000) && await wait(B, () => APP.screen === 'battle', 7000));
  ok('el tercero entra como espectador', await wait(C, () => APP.screen === 'netview', 7000));
  ok('el espectador recibe imágenes de la pelea', await wait(C, () => !!Net.lastSnapObj, 7000));
  await A.evaluate(() => {
    Net.stopRollback();
    APP.showResults({ mode: 'stock', draw: false, stage: 'temple', teams: false, winTeam: -1, goals: null, party: null,
      ranked: [
        { port: 1, id: 'pablo', cpu: false, color: PLAYER_COLORS[1], kos: 1, falls: 0, dealt: 30, sd: 0, score: 1, stocks: 1 },
        { port: 0, id: 'nacho', cpu: false, color: PLAYER_COLORS[0], kos: 0, falls: 1, dealt: 10, sd: 0, score: 0, stocks: 0 },
      ] });
  });
  const resultB = await wait(B, () => APP.screen === 'results' && Tourney.champion === 1);
  const resultC = await wait(C, () => APP.screen === 'results' && Tourney.champion === 1);
  const state = async p => p.evaluate(() => [APP.screen, Tourney.champion, Tourney.retry, Net.hostPres()?.lob?.ph, Net.codeOf(Net.hostPeer), Net.lastRoomCode]);
  ok('todos reciben campeón y resultados', resultB && resultC, JSON.stringify({ A: await A.evaluate(() => [APP.screen, Tourney.champion, Tourney.retry, Net.lob.ph]), B: await state(B), C: await state(C) }));
  await A.evaluate(() => { APP.go('tournament'); Net.publishLobby({ ph: 'tour', tr: Tourney.snapshot(), res: null }); });
  ok('todos vuelven al cuadro final', await wait(B, () => APP.screen === 'tournament' && Tourney.champion === 1) && await wait(C, () => APP.screen === 'tournament'));
  ok('la última sala queda guardada para volver', await B.evaluate(() => !!Net.codeOf(Net.hostPeer) && localStorage.getItem('apyv-last-room-v1') === Net.codeOf(Net.hostPeer)), JSON.stringify(await B.evaluate(() => [localStorage.getItem('apyv-last-room-v1'), Net.codeOf(Net.hostPeer), Net.lastRoomCode])));
  const failed = checks.filter(x => !x).length + errors.length;
  console.log((checks.length - checks.filter(x => !x).length) + ' OK, ' + failed + ' FAIL', errors);
  await browser.close(); srv.kill();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
