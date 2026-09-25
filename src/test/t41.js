// El canal de Xochimilco ya no deja a nadie "hundido" para siempre (llegaban a 999% sin salir volando)
// y los escenarios grandes tienen el techo a la misma distancia que los chicos
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html')); await page.waitForTimeout(500);
  let pass = 0, fail = 0; const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const r = await page.evaluate(() => {
    const out = {}, run = n => { for (let i = 0; i < n; i++) step(); };
    for (let i = 0; i < 5; i++) step();
    APP.startBattle({ players: [{ port: 0, char: 'luchador', dev: 'kb1' }, { port: 1, char: 'michi', cpu: 1 }], stage: 'xochi', rules: { mode: 'stock', stocks: 9, items: 0, time: 99 } });
    const B = BATTLE, st = B.stage; B.stage.update = () => {};
    for (let i = 0; i < 400 && B.phase !== 'fight'; i++) step();
    const [f, o] = B.fighters; o.brain = null; o.ctrl = new Controller('q1'); f.ctrl = new Controller('q2');
    const hull = st.solids[0];
    // a 200% cae al canal junto a la orilla: se hunde y ya no puede agarrarse de la trajinera
    f.x = hull.x + hull.w + 200; f.y = CANAL_Y - 30; f.vx = 0; f.vy = 6; f.grounded = false; f.surface = null; f.setState('air'); f.percent = 200; f.stocks = 9;
    let grabbed = false, sunk = false; const s0 = f.stocks;
    for (let i = 0; i < 400; i++) {
      step(); if (f.sunk && !sunk) { sunk = true; f.x = hull.x + hull.w + 30; } // mientras se hunde, pasa junto a la orilla
      if (f.state === 'ledge') grabbed = true; if (f.stocks < s0) break;
    }
    out.sinkLedge = { sunk, grabbed, lost: f.stocks < s0 };
    // alguien que quedó marcado como hundido y volvió a tierra: la marca se borra y los golpes sí lo lanzan
    run(200);
    f.move = null; f.x = 0; f.y = st.top; f.vx = f.vy = f.lx = f.ly = 0; f.grounded = true; f.surface = hull; f.setState('idle'); f.invuln = 0; f.hitlag = 0; f.dead = false;
    f.sunk = true; run(2);
    out.clearedOnLand = !f.sunk;
    f.percent = 300; o.x = -40; o.y = st.top; o.face = 1; o.invuln = 0;
    applyHit(o, f, { dmg: 5, ang: 45, bkb: 6, kbg: 8 }, 1); run(12);
    out.launched = { x: Math.round(f.x), lx: +f.lx.toFixed(1), st: f.state };
    // escenarios: el techo a una distancia parecida en todos
    out.tops = {};
    for (const id of ['temple', 'city', 'stadium', 'pyramid']) {
      APP.startBattle({ players: [{ port: 0, char: 'daniel', cpu: 1 }, { port: 1, char: 'nacho', cpu: 1 }], stage: id, rules: { mode: 'stock', stocks: 3, items: 0 } });
      out.tops[id] = BATTLE.stage.top - BATTLE.stage.blast.t;
    }
    return out;
  });
  console.log(JSON.stringify(r));
  ok('quien se hunde en el canal ya no se agarra de la orilla (se lo lleva el canal)', r.sinkLedge.sunk && !r.sinkLedge.grabbed && r.sinkLedge.lost, JSON.stringify(r.sinkLedge));
  ok('al volver a tierra se borra el hundimiento', r.clearedOnLand);
  ok('a 300% un golpe sí lo manda a volar (antes se cancelaba en el aire)', Math.abs(r.launched.lx) > 5 || Math.abs(r.launched.x) > 150, JSON.stringify(r.launched));
  ok('techo de los escenarios grandes cerca del de los chicos (≤ 1250)', Object.values(r.tops).every(v => v <= 1250), JSON.stringify(r.tops));
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
