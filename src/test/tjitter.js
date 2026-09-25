// La CPU no se queda girando de lado a lado sin avanzar (contra un rival quieto, encimada, colgado de la orilla
// o justo arriba/abajo): 15 personajes × niveles 3/5/9 en cuatro escenarios
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/super-golpazo.html'); await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    const res = [];
    const stages = ['temple', 'xochi', 'city', 'pyramid'];
    let seed = 99; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const CH of CHAR_ORDER) for (const LV of [3, 5, 9]) {
      const STG = stages[(CHAR_ORDER.indexOf(CH) + LV) % stages.length];
      const opp = CH === 'daniel' ? 'nicole' : 'daniel';
      APP.startBattle({ players: [{ port: 0, char: opp, dev: 'kb1' }, { port: 1, char: CH, cpu: LV }], stage: STG, rules: { mode: 'stock', stocks: 99, items: 0, time: 0 } });
      const B = BATTLE, n = B.fighters[1]; const faces = [], xs = []; let bad = 0, worst = 0, where = null;
      for (let i = 0; i < 2400; i++) {
        step(); faces.push(n.face); xs.push(n.x);
        if (i >= 40) { let fl = 0; for (let k = i - 39; k <= i; k++) if (faces[k] !== faces[k - 1]) fl++; if (fl >= 6 && Math.abs(xs[i] - xs[i - 40]) < 60) { bad++; if (fl > worst) { worst = fl; where = { i, st: n.state, pst: B.fighters[0].state, nx: Math.round(n.x), px: Math.round(B.fighters[0].x), g: n.grounded }; } } }
      }
      if (bad) res.push({ CH, LV, STG, bad, worst, where });
    }
    return res;
  });
  const ok = out.length === 0;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ninguna CPU gira en su lugar sin avanzar${ok ? '' : '  → ' + JSON.stringify(out.slice(0, 4))}`);
  console.log(`\n${ok ? 1 : 0} OK, ${ok ? 0 : 1} FAIL`);
  await browser.close(); process.exit(ok ? 0 : 1);
})();
