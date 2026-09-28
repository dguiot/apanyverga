// Seis luchadores locales, límite online, escenario nuevo y eventos escasos.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(500);
  let pass = 0, fail = 0;
  const ok = (name, yes, info) => { if (yes) pass++; else fail++; console.log(`${yes ? 'OK  ' : 'FAIL'} ${name}${info === undefined ? '' : ' → ' + info}`); };
  const a = await page.evaluate(() => {
    for (let i = 0; i < 4; i++) step();
    APP.slots = freshSlots('kb1');
    APP.slots[0].ready = true; APP.slots[0].pick = 'centella'; APP.slots[0].focus = 0;
    for (let i = 1; i < 6; i++) APP.slots[i] = { type: 'cpu', cur: i, ready: true, pick: CHAR_ORDER[i], level: 5, team: i % 2 };
    APP.go('charsel'); step(); render(); const selectPng = canvas.toDataURL('image/png');
    const boxes = APP.slots.map((_, i) => APP.slotRect(i));
    const select = boxes.length === 6 && boxes.every(r => r.x >= 0 && r.x + r.w <= W && r.y >= 328 && r.y + r.h <= 650);
    const char = !!CHARS.centella && !!SPECIALS.centella && !!LOOKS.centella && !!ABILITIES.centella && CHAR_ORDER.includes('centella');
    APP.rules.mode = 'stock'; APP.stageSel = STAGE_INFO.findIndex(s => s.id === 'rain'); APP.go('stagesel');
    for (let i = 0; i < STAGE_INFO.length + 2; i++) { step(); render(); }
    const stagePng = canvas.toDataURL('image/png');
    const cards = STAGE_INFO.map((_, i) => APP.stageRect(i));
    const stages = cards.length === 9 && cards.every(r => r.y + r.h < 368) && !!APP.previews.rain;
    const setup = { players: APP.slots.map((s, i) => ({ port: i, char: s.pick, cpu: i ? 5 : 0, dev: i ? null : 'kb1' })), stage: 'rain', rules: { mode: 'stock', stocks: 3, items: 0, time: 3 } };
    APP.startBattle(setup); const B = BATTLE; B.phase = 'fight'; render(); const battlePng = canvas.toDataURL('image/png');
    const six = B.fighters.length === 6 && B.fighters.every(f => f.x >= B.stage.left && f.x <= B.stage.right) && B.fighters[0].id === 'centella';
    B.fighters[0].invuln = 999;
    for (const f of B.fighters.slice(1)) { f.brain = null; f.ctrl = new Controller('quiet' + f.port); }
    let special = false; const oldSpawn = spawnProjectile;
    spawnProjectile = (owner, p) => { if (owner === B.fighters[0] && p.type === 'note' && p.col === '#78edff') special = true; return oldSpawn(owner, p); };
    B.fighters[0].startMove('sp_n'); for (let i = 0; i < 20; i++) B.advance();
    spawnProjectile = oldSpawn;
    let snapshotLen = 0; const oldSet = Net.set; Net.set = data => { if (data.st) snapshotLen = JSON.stringify(data.st).length; };
    Net.pushSnapshot(B); Net.set = oldSet;
    const rain = B.stage;
    rain.boltTimer = 1; rain.step(); rain.boltTimer = 1; rain.step(); rain.boltTimer = 1; rain.step();
    const scarce = rain.boltCount === 2;
    APP.results = { ranked: B.fighters.map((f, i) => ({ port: i, id: f.id, cpu: !!f.cpu, color: f.color, kos: 0, falls: 0, dealt: 0, score: 0, stocks: 3, win: i === 0 })), mode: 'stock', stage: 'Mirador de Lluvia', teams: false, draw: false };
    APP.go('results'); render();
    const netFns = { myPeer: Net.myPeer, guestsOf: Net.guestsOf, nameOf: Net.nameOf };
    Net.role = 'host'; Net.lob.ph = 'lobby'; Net.myPeer = () => 'host'; Net.nameOf = g => g;
    Net.guestsOf = () => Array.from({ length: 5 }, (_, i) => ({ peer: `guest${i}`, presence: { ch: i, rdy: 1, tm: i % 2 } }));
    APP.slots = freshSlots('local'); APP.slots[4] = APP.newCPU(true, 4); APP.slots[5] = APP.newCPU(true, 5);
    Net.syncSlots();
    const humans = APP.slots.filter(s => s.type === 'human').length, cpus = APP.slots.filter(s => s.type === 'cpu').length;
    Object.assign(Net, netFns); Net.role = 'off';
    return { select, char, stages, six, special, snapshotLen, scarce, humans, cpus, selectPng, stagePng, battlePng };
  });
  const fs = require('fs');
  for (const key of ['selectPng', 'stagePng', 'battlePng']) {
    fs.writeFileSync('shots/look/six-' + key + '.png', Buffer.from(a[key].split(',')[1], 'base64'));
    delete a[key];
  }
  ok('seis lugares visibles en dos filas', a.select);
  ok('Centella en plantel, arte y movimientos', a.char);
  ok('nueve escenarios visibles y miniatura del mirador', a.stages);
  ok('seis luchadores aparecen dentro del escenario', a.six);
  ok('el especial eléctrico de Centella funciona', a.special);
  ok('la foto online de seis cabe en Presence', a.snapshotLen > 0 && a.snapshotLen < 3000, `${a.snapshotLen} bytes`);
  ok('el rayo del mirador ocurre a lo sumo dos veces', a.scarce);
  ok('online: cuatro personas y dos CPU', a.humans === 4 && a.cpus === 2, `${a.humans} personas, ${a.cpus} CPU`);
  ok('sin errores de dibujo o ejecución', !errs.length, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
