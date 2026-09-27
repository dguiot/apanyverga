// Cuadro local, empate, interrupción y preferencias recordadas.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/index.html');
  const cases = await page.evaluate(() => {
    const out = [], check = (name, pass) => out.push({ name, pass });
    const make = n => ({
      players: Array.from({ length: n }, (_, i) => ({ port: i, char: CHAR_ORDER[i], dev: i % 2 ? 'kb2' : 'kb1', cpu: 0 })),
      stage: 'temple', rules: { mode: 'stock', stocks: 3, items: 0, time: 3, teams: false, party: false },
    });
    const win = port => ({ draw: false, ranked: [{ port, cpu: false }, { port: 1 - port, cpu: false }] });
    Net.role = 'off';
    check('dos amigos tienen una sola final', Tourney.begin(make(2)) && Tourney.matches.length === 1 && Tourney.match().a === 0 && Tourney.match().b === 1);
    Tourney.start();
    check('la final usa solo los dos jugadores', APP.screen === 'vs' && APP.pendingSetup.players.length === 2);
    Tourney.record(win(1));
    check('el ganador recibe el campeonato', Tourney.champion === 1);
    Tourney.begin(make(3));
    check('con tres hay pase directo a la final', Tourney.matches[0].a === 1 && Tourney.matches[0].b === 2 && Tourney.matches[1].a === 0);
    Tourney.record({ draw: true, ranked: [{ port: 0, cpu: false }, { port: 1, cpu: false }] });
    check('el empate no elimina a nadie', Tourney.current === 0 && Tourney.retry);
    Tourney.record(win(1));
    check('el vencedor de la semifinal entra en la final', Tourney.current === 1 && Tourney.match().b === 2);
    Tourney.record(win(0));
    check('el pase directo puede ser campeón', Tourney.champion === 0);
    Tourney.begin(make(4));
    Tourney.record(win(0));
    Tourney.record(win(1));
    check('la final de cuatro recibe ambos vencedores', Tourney.match().a === 0 && Tourney.match().b === 2);
    Tourney.interrupted = true; Tourney.record(win(0));
    check('la desconexión exige repetir la ronda', Tourney.current === 2 && Tourney.retry && Tourney.champion === -1);
    Tourney.interrupted = false; Tourney.record(win(1));
    check('el segundo vencedor de la final es campeón', Tourney.champion === 2);
    Tourney.stop();
    check('no se admiten CPU', !Tourney.begin({ players: make(2).players.map((p, i) => Object.assign({}, p, { cpu: i })), stage: 'temple', rules: make(2).rules }));
    APP.go('settings'); APP.draw();
    check('la pantalla de ajustes dibuja sin error', APP.screen === 'settings');
    Prefs.quality = 'fast'; Prefs.contrast = true; Prefs.save();
    check('la calidad y contraste se guardan', JSON.parse(localStorage.getItem('apyv-display-v1')).contrast === true && Prefs.saved);
    APP.go('binds'); APP.bind = { col: 0, dev: 0, row: 0, msg: '' };
    const oldNav = Devices.nav;
    Devices.nav = d => d === 'kb1' ? { start: true } : {};
    APP.bindsUpdate(); Devices.nav = oldNav;
    check('Start abre la configuración rápida del teclado', Capture.active && APP.bind.guideAt === 0 && APP.bind.guide.length === 10);
    Capture.result = 'KeyQ'; APP.bindsUpdate();
    check('la guía guarda un paso y continúa con el siguiente', APP.bind.guideAt === 1 && Capture.active && Binds.forDev('kb1').left[0] === 'KeyQ');
    Capture.cancel = true; APP.bindsUpdate();
    check('Esc cancela la guía sin perder lo guardado', !Capture.active && !APP.bind.guide && Binds.forDev('kb1').left[0] === 'KeyQ');
    Binds.bind('kb1', 'attack', 'KeyQ');
    check('el teclado queda guardado en el dispositivo', JSON.parse(localStorage.getItem('golpazo-binds-v1')).kb.kb1.attack[0] === 'KeyQ' && Binds.saved);
    return out;
  });
  await page.evaluate(() => {
    Tourney.begin({
      players: Array.from({ length: 4 }, (_, i) => ({ port: i, char: CHAR_ORDER[i], dev: i % 2 ? 'kb2' : 'kb1', cpu: 0 })),
      stage: 'temple', rules: { mode: 'stock', stocks: 3, items: 0, time: 3, teams: false, party: false },
    });
    APP.draw();
  });
  await page.screenshot({ path: 'shots/tournament.png' });
  await page.reload();
  const persisted = await page.evaluate(() => Prefs.quality === 'fast' && Prefs.contrast && Binds.forDev('kb1').attack[0] === 'KeyQ');
  cases.push({ name: 'ajustes y teclado sobreviven al reinicio', pass: persisted });
  for (const c of cases) console.log((c.pass ? 'OK  ' : 'FAIL') + c.name);
  const failed = cases.filter(c => !c.pass).length + errors.length;
  console.log((cases.length - cases.filter(c => !c.pass).length) + ' OK, ' + failed + ' FAIL', errors);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
