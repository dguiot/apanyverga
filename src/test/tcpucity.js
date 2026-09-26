// Azoteas de Neón: la CPU que cae a la calle del lado de afuera (sin elevador) sale por el tendedero
// (salto completo, doble salto por encima de la cuerda y, si no le alcanza, el especial hacia arriba).
// Antes se quedaba dando saltitos contra la pared del edificio toda la pelea.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html')); await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    let seed = 11; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const fails = []; let n = 0, ok = 0;
    for (const id of CHAR_ORDER) for (const side of [-1, 1]) {
      APP.startBattle({ players: [{ port: 0, char: 'daniel', dev: 'kb1' }, { port: 1, char: id, cpu: 5 }], stage: 'city', rules: { mode: 'stock', stocks: 3, items: 0 } });
      for (let i = 0; i < 155; i++) step();
      const [p, c] = BATTLE.fighters; p.x = 0; p.y = -60; c.x = side * 1300; c.y = 640; c.vx = c.vy = 0; BATTLE.stage.nextTrain = 99999;
      let out = false;
      for (let i = 0; i < 480 && !out; i++) { step(); if (c.y < 100 && c.grounded) out = true; }
      n++; if (out) ok++; else fails.push(id + (side < 0 ? ' izq' : ' der'));
    }
    return { n, ok, fails };
  });
  let pass = 0, fail = 0;
  const okf = (name, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${name}${info !== undefined ? '  → ' + info : ''}`); };
  okf('la CPU sale del callejón de las azoteas en menos de 8 s', r.ok >= Math.ceil(r.n * 0.85), `${r.ok}/${r.n}` + (r.fails.length ? ' · no: ' + r.fails.join(', ') : ''));
  okf('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
